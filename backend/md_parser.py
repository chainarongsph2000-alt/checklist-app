"""
md_parser.py — Markdown to HTML conversion
Uses python-markdown library + custom wikilink extension
"""
import re
import markdown
from markdown.inlinepatterns import InlineProcessor
import xml.etree.ElementTree as ET


# ─── Custom Wikilink Extension ─────────────────────────────
class WikilinkPattern(InlineProcessor):
    """Convert [[Link|Text]] to <a class='law-link' href='/api/law/Link'>Text</a>"""
    def handleMatch(self, m, data):
        full = m.group(1)
        parts = full.split('|', 1)
        target = parts[0].strip()
        text = parts[1].strip() if len(parts) > 1 else target
        a = ET.Element('a')
        a.set('class', 'law-link')
        a.set('href', f'/api/law/{target}')
        a.text = text
        return a, m.start(0), m.end(0)


class WikilinkExtension(markdown.Extension):
    def extendMarkdown(self, md):
        md.inlinePatterns.register(WikilinkPattern(r'\[\[([^\]]+)\]\]'), 'wikilink', 175)


# ─── Custom Checkbox Extension ─────────────────────────────
CHECKBOX_RE = re.compile(r'^(\s*)[-*] \[([ x])\] (.*)', re.MULTILINE)

def _checkbox_replacer(m):
    indent = m.group(1)
    checked = m.group(2)
    text = m.group(3)
    checked_attr = ' checked' if checked == 'x' else ''
    disabled_attr = ' disabled' if checked == 'x' else ''
    return f'{indent}<label class="check-label"><input type="checkbox" class="check-item"{checked_attr}{disabled_attr}> {text}</label>'


def preprocess_checkboxes(text: str) -> str:
    """Convert - [ ] / - [x] to HTML checkbox before markdown parsing."""
    return CHECKBOX_RE.sub(_checkbox_replacer, text)


def preprocess_wikilinks(text: str) -> str:
    """
    Convert \\| to | inside wikilinks [[...\\|...]] before markdown parsing.
    Obsidian uses \\| to escape pipe in wikilinks inside tables.
    """
    WIKILINK_PIPE_RE = re.compile(r'(\[\[[^\]]+?)\\\|([^\]]+\]\])')
    return WIKILINK_PIPE_RE.sub(r'\1|\2', text)


# ─── Heading ID helpers ────────────────────────────────────
def _clean_heading_id(text: str) -> str:
    """Generate a clean HTML id from heading text."""
    sid = text.strip()
    sid = sid.replace(' — ', '-').replace(' ', '-')
    sid = re.sub(r'[\-]+', '-', sid)
    sid = re.sub(r'[^\w\-ก-๙]', '', sid, flags=re.UNICODE)
    sid = sid.strip('-')
    return sid[:60]


def _add_heading_ids(html: str) -> str:
    """Add id attributes to h2/h3 tags for anchor linking."""
    def _replacer(m):
        tag = m.group(1)
        content = m.group(2)
        hid = _clean_heading_id(content)
        if not hid:
            return m.group(0)
        return f'<h{tag} id="{hid}">{content}</h{tag}>'
    return re.sub(r'<h([23])>(.*?)</h\1>', _replacer, html)


# ─── Main conversion ───────────────────────────────────────
def md_to_html(text: str) -> str:
    """
    Convert markdown text to HTML with:
    - Wikilinks [[Link|Text]]
    - Checkboxes - [ ] / - [x]
    - Full markdown support (tables, code blocks, etc.)
    - Heading IDs for anchor linking
    """
    if not text:
        return ""

    # Pre-process checkboxes & wikilink pipe escapes (before markdown parsing)
    text = preprocess_checkboxes(text)
    text = preprocess_wikilinks(text)

    # Configure markdown extensions
    md = markdown.Markdown(
        extensions=[
            'extra',            # tables, code blocks, footnotes
            'sane_lists',        # proper list handling
            'nl2br',             # newlines → <br>
            WikilinkExtension(),   # custom [[wikilinks]]
        ]
    )

    html = md.convert(text)

    # Post-process: add anchor IDs to h2/h3 for scroll-to-section
    html = _add_heading_ids(html)

    return html


def load_md(filepath) -> dict:
    """
    Load .md file and return structured dict.

    Returns:
        dict with keys: title, html, raw, tags, links, filename, toc
    """
    from pathlib import Path
    filepath = Path(filepath)

    raw = filepath.read_text(encoding='utf-8')
    html = md_to_html(raw)

    # Extract title from first H1
    title = ""
    title_match = re.search(r'^# (.+)$', raw, re.MULTILINE)
    if title_match:
        title = title_match.group(1).strip()

    # Extract headings for TOC
    headings = re.findall(r'^(#{2,3}) (.+)$', raw, re.MULTILINE)
    toc = []
    for level, text in headings:
        toc.append({
            "level": len(level),
            "text": text.strip(),
            "id": _clean_heading_id(text.strip()),
        })

    # Extract tags (#tag)
    tags = re.findall(r'#([\wก-เ]+)', raw)

    # Extract wikilinks
    links = re.findall(r'\[\[([^\]|]+)(?:\|[^\]|]+)?\]\]', raw)

    return {
        "title": title,
        "html": html,
        "raw": raw,
        "tags": tags,
        "links": links,
        "filename": filepath.stem,
        "toc": toc,
    }

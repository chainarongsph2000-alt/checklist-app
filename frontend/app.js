/**
 * app.js — Checklist App v1.0
 * เทศบาลตำบลเมืองเก่า
 * Features: 2-step select, localStorage persist, accordion law panel,
 *           anchor scroll, save inspection, keyboard shortcuts
 */

// ─── State ────────────────────────────────────────────────
let currentChecklist = null;
let failedItems = [];
let allChecklists = [];
let currentLawData = null;

// ─── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadChecklists();
    restoreChecklistSelection();
});

// ─── Load checklists ──────────────────────────────────────
async function loadChecklists() {
    try {
        const res = await fetch('/api/checklists');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        allChecklists = await res.json();
        renderCategorySelect();
    } catch (e) {
        console.error('Failed to load checklists:', e);
    }
}

function renderCategorySelect() {
    // Group by category prefix (e.g., "01-", "02-")
    const sel = document.getElementById('checklistSelect');
    sel.innerHTML = '<option value="">— เลือกประเภทอาคาร —</option>';
    
    allChecklists.forEach(l => {
        const opt = document.createElement('option');
        opt.value = l.id;
        // Clean title: remove emoji prefix like 🏠 for cleaner display
        let display = l.title;
        if (l.tags && l.tags.length) {
            const tagBadge = l.tags.slice(0, 2).join(', ');
        }
        opt.textContent = display;
        sel.appendChild(opt);
    });
}

// ─── Persist checklist selection ──────────────────────────
function restoreChecklistSelection() {
    const saved = localStorage.getItem('checklist-selected');
    if (saved) {
        document.getElementById('checklistSelect').value = saved;
        if (saved) loadChecklist(saved);
    }
}

// ─── Load checklist ───────────────────────────────────────
async function loadChecklist(id) {
    if (!id) { showHome(); return; }
    localStorage.setItem('checklist-selected', id);
    
    try {
        const res = await fetch(`/api/checklist/${encodeURIComponent(id)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data || data.error) return;
        currentChecklist = data;
        failedItems = [];
        renderChecklist(data);
    } catch (e) {
        console.error('Failed to load checklist:', e);
        document.getElementById('checklistContent').innerHTML = 
            `<div class="card"><p style="color:var(--danger);">❌ โหลดไม่สำเร็จ: ${e.message}</p></div>`;
    }
}

// ─── Render checklist ─────────────────────────────────────
function renderChecklist(data) {
    document.getElementById('emptyState').style.display = 'none';
    const panel = document.getElementById('checklistContent');
    panel.style.display = 'block';
    
    const savedChecks = getSavedChecks(data.filename);

    let html = `<div class="card">
        <div class="card-title" style="font-size:1.2rem;">
            ${data.title || 'ตรวจแบบ'} 
            <span class="badge badge-yellow">🟡 ปานกลาง</span>
        </div>
        <div class="summary-bar" id="summaryBar">
            <div class="summary-item">✅ <span class="summary-num" id="passedCount">0</span> ผ่าน</div>
            <div class="summary-item">❌ <span class="summary-num" id="failedCount">0</span> ไม่ผ่าน</div>
            <div class="summary-item">📋 <span class="summary-num" id="totalCount">0</span> รายการ</div>
        </div>
        <div class="checklist-body">${data.html}</div>
        <div style="margin-top:1rem;display:flex;gap:0.5rem;flex-wrap:wrap;">
            <button class="btn btn-success" onclick="generateLetter('passed')">📄 แจ้งผ่าน</button>
            <button class="btn btn-danger" onclick="generateLetter('failed')">📄 แจ้งแก้ไข</button>
            <button class="btn btn-primary" onclick="saveInspection()">💾 บันทึกผลตรวจ</button>
            <button class="btn btn-ghost" onclick="clearChecks()">🔄 รีเซ็ต</button>
        </div>
    </div>`;
    
    panel.innerHTML = html;
    attachCheckboxListeners(savedChecks);
    updateSummary();
}

// ─── Save inspection to dashboard ─────────────────────────
async function saveInspection() {
    if (!currentChecklist) return;
    updateSummary();
    
    const checkboxes = document.querySelectorAll('.check-item');
    const total = checkboxes.length;
    let passed = 0;
    const result = {};
    
    checkboxes.forEach((cb, i) => {
        const label = cb.closest('.check-label');
        const text = label ? label.textContent.trim().split('\n')[0] : `ข้อ ${i+1}`;
        result[`item_${i}`] = { text, checked: cb.checked };
        if (cb.checked) passed++;
    });
    const failed = total - passed;
    
    try {
        const res = await fetch('/api/inspections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                checklist_id: currentChecklist.filename,
                checklist_title: currentChecklist.title || currentChecklist.filename,
                result: result,
                passed: passed,
                failed: failed,
                total: total,
                status: 'completed'
            })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        alert(`✅ บันทึกผลตรวจแล้ว (ID: ${data.id})`);
    } catch (e) {
        alert(`❌ บันทึกไม่สำเร็จ: ${e.message}`);
    }
}

// ─── Persist check state (localStorage) ───────────────────
function getStorageKey(filename) {
    return `checklist-state-${filename}`;
}
function getSavedChecks(filename) {
    try {
        const saved = localStorage.getItem(getStorageKey(filename));
        return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
}
function saveCheckState(filename, index, checked) {
    const key = getStorageKey(filename);
    const state = getSavedChecks(filename);
    state[index] = checked;
    localStorage.setItem(key, JSON.stringify(state));
}
function getCheckIndex(cb) {
    const all = document.querySelectorAll('.check-item');
    return Array.from(all).indexOf(cb);
}

// ─── Checkbox listeners ───────────────────────────────────
function attachCheckboxListeners(savedChecks = {}) {
    document.querySelectorAll('.check-item').forEach((cb, i) => {
        if (savedChecks[i] !== undefined) cb.checked = savedChecks[i];
        cb.addEventListener('change', function() {
            if (currentChecklist) {
                saveCheckState(currentChecklist.filename, getCheckIndex(this), this.checked);
            }
            updateSummary();
        });
    });
}

function clearChecks() {
    if (!currentChecklist) return;
    if (!confirm('รีเซ็ต checkbox ทั้งหมด?')) return;
    localStorage.removeItem(getStorageKey(currentChecklist.filename));
    document.querySelectorAll('.check-item').forEach(cb => cb.checked = false);
    updateSummary();
}

// ─── Update summary ───────────────────────────────────────
function updateSummary() {
    const checkboxes = document.querySelectorAll('.check-item');
    const total = checkboxes.length;
    let passed = 0, failed = 0;
    
    checkboxes.forEach(cb => {
        const label = cb.closest('.check-label') || cb.parentElement;
        if (cb.checked) { passed++; label?.classList.add('passed'); label?.classList.remove('failed'); }
        else { failed++; label?.classList.add('failed'); label?.classList.remove('passed'); }
    });
    
    const pEl = document.getElementById('passedCount');
    const fEl = document.getElementById('failedCount');
    const tEl = document.getElementById('totalCount');
    if (pEl) pEl.textContent = passed;
    if (fEl) fEl.textContent = failed;
    if (tEl) tEl.textContent = total;
    
    failedItems = [];
    document.querySelectorAll('.check-item:not(:checked)').forEach(cb => {
        const label = cb.closest('.check-label') || cb.parentElement;
        if (label) failedItems.push(label.textContent.trim().split('\n')[0]);
    });
}

// ─── Show law in sidebar (with accordion + TOC) ──────────
async function showLaw(lawPath, anchorId = null) {
    const panel = document.getElementById('lawContent');
    panel.innerHTML = '<div class="loading spinner"> กำลังโหลด...</div>';
    
    try {
        const encodedPath = lawPath.split('/').map(s => encodeURIComponent(s)).join('/');
        let url = `/api/law/${encodedPath}`;
        if (anchorId) url += `?anchor=${encodeURIComponent(anchorId)}`;
        
        const res = await fetch(url);
        if (!res.ok) {
            panel.innerHTML = `<p style="color:var(--danger);">❌ ไม่พบ: ${lawPath}</p>`;
            return;
        }
        const data = await res.json();
        if (data.error) {
            panel.innerHTML = `<p style="color:var(--danger);">❌ ${data.error}</p>`;
            return;
        }
        
        currentLawData = data;
        
        // Build law panel with TOC + accordion content
        let tocHtml = '';
        if (data.toc && data.toc.length > 0) {
            tocHtml = '<div class="law-toc">';
            data.toc.forEach(h => {
                const indent = h.level === 3 ? 'style="padding-left:1rem;font-size:0.82rem;"' : '';
                tocHtml += `<a href="#${h.id}" class="toc-item" onclick="scrollToHeading('${h.id}');return false;" ${indent}>📌 ${h.text}</a>`;
            });
            tocHtml += '</div>';
        }
        
        panel.innerHTML = `
            <div style="margin-bottom:0.75rem;display:flex;gap:0.5rem;flex-wrap:wrap;">
                <input class="law-search" id="lawSearch" placeholder="🔍 ค้นหาในหน้านี้..." style="flex:1;padding:0.4rem 0.6rem;border-radius:6px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:0.82rem;">
                <button class="btn btn-ghost" onclick="expandAllLaw()" style="font-size:0.75rem;">▶ ทั้งหมด</button>
                <button class="btn btn-ghost" onclick="collapseAllLaw()" style="font-size:0.75rem;">▼ ย่อ</button>
            </div>
            ${tocHtml}
            <div class="law-body" id="lawBody">
                ${data.html}
            </div>`;
        
        // Add accordion behavior to TOC items
        document.querySelectorAll('.toc-item').forEach(a => {
            a.addEventListener('click', function(e) {
                e.preventDefault();
                const targetId = this.getAttribute('href').substring(1);
                scrollToHeading(targetId);
            });
        });
        
        // Add in-page search
        document.getElementById('lawSearch')?.addEventListener('input', function() {
            const body = document.getElementById('lawBody');
            if (!body) return;
            const q = this.value.toLowerCase();
            if (q.length < 2) { body.style.display = 'block'; return; }
            // Simple highlight: show all, mark matches
            const paragraphs = body.querySelectorAll('p, li, td, h2, h3');
            paragraphs.forEach(el => {
                if (el.textContent.toLowerCase().includes(q)) {
                    el.style.display = '';
                    el.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
                    el.style.borderRadius = '4px';
                    el.style.padding = '2px 4px';
                } else {
                    el.style.display = 'none';
                }
            });
        });
        
        // Scroll to anchor if provided
        if (anchorId) {
            setTimeout(() => scrollToHeading(anchorId), 300);
        }
    } catch(e) {
        panel.innerHTML = `<p style="color:var(--danger);">❌ Error: ${e.message}</p>`;
    }
}

// ─── Scroll to heading in law panel ───────────────────────
function scrollToHeading(id) {
    const el = document.getElementById('lawBody')?.querySelector(`[id="${id}"]`);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Highlight briefly
        el.style.transition = 'background 0.5s';
        el.style.backgroundColor = 'rgba(59, 130, 246, 0.3)';
        el.style.borderRadius = '4px';
        el.style.padding = '2px 4px';
        setTimeout(() => {
            el.style.backgroundColor = 'transparent';
        }, 2000);
    }
}

function expandAllLaw() {
    document.querySelectorAll('.law-body h2, .law-body h3').forEach(h => {
        let next = h.nextElementSibling;
        while (next && !['H2', 'H3'].includes(next.tagName)) {
            next.style.display = '';
            next = next.nextElementSibling;
        }
    });
}

function collapseAllLaw() {
    // Simple: show only headings
    document.querySelectorAll('.law-body > *').forEach(el => {
        if (!['H2', 'H3', 'H1', 'HR'].includes(el.tagName)) {
            el.style.display = 'none';
        }
    });
}

// ─── Intercept law link clicks ──────────────────────────
document.addEventListener('click', function(e) {
    const link = e.target.closest('.law-link');
    if (link) {
        e.preventDefault();
        const href = link.getAttribute('href').replace('/api/law/', '');
        showLaw(href);
    }
});

// ─── Search (vault-wide) ────────────────────────────────
let searchTimeout;
let searchAbortController = null;

function searchLaw(q) {
    clearTimeout(searchTimeout);
    const results = document.getElementById('searchResults');
    if (q.length < 2) { results.classList.remove('show'); return; }
    
    searchTimeout = setTimeout(async () => {
        if (searchAbortController) searchAbortController.abort();
        searchAbortController = new AbortController();
        
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=10`, {
                signal: searchAbortController.signal
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            
            results.innerHTML = '';
            if (!data.results || data.results.length === 0) {
                results.innerHTML = '<div class="search-item" style="color:var(--muted);">ไม่พบผลลัพธ์</div>';
            } else {
                data.results.forEach(r => {
                    const div = document.createElement('div');
                    div.className = 'search-item';
                    div.innerHTML = `${escapeHtml(r.context)} <span class="file">📄 ${escapeHtml(r.file)}</span>`;
                    div.onclick = () => {
                        document.getElementById('searchInput').value = '';
                        results.classList.remove('show');
                        const path = r.file.replace('.md', '').replace(/^กฎหมาย\//, '');
                        showLaw(path);
                    };
                    results.appendChild(div);
                });
            }
            results.classList.add('show');
        } catch(e) {
            if (e.name !== 'AbortError') console.error('Search error:', e);
        }
    }, 300);
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('.search-wrapper')) {
        document.getElementById('searchResults').classList.remove('show');
    }
});

// ─── Generate letter ───────────────────────────────────
function generateLetter(mode) {
    if (!currentChecklist) return;
    const now = new Date();
    const dateStr = now.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
    
    let body = '';
    if (mode === 'passed') {
        body = `ด้วยเจ้าพนักงานท้องถิ่นได้ตรวจแบบแปลนการก่อสร้างแล้ว ปรากฏว่าเป็นไปตามที่กำหนดในกฎกระทรวงฯ และกฎหมายที่เกี่ยวข้อง จึงแจ้งให้ทราบ`;
    } else {
        const failed = failedItems.map((item, i) => `${i+1}. ${item}`).join('\n');
        body = `ด้วยเจ้าพนักงานท้องถิ่นได้ตรวจแบบแปลนการก่อสร้างแล้ว ปรากฏว่ารายการต่อไปนี้ไม่เป็นไปตามที่กฎหมายกำหนด\n\n${failed}\n\nจึงขอให้ดำเนินการแก้ไขและยื่นเอกสารใหม่ภายใน 15 วัน`;
    }
    
    const letter = `เรื่อง แจ้งผลการตรวจแบบแปลน\n\nเรียน ${currentChecklist.title || 'ผู้ยื่นคำขอ'}\n\n${body}\n\nจึงแจ้งมาเพื่อทราบและดำเนินการ\n\nลงวันที่ ${dateStr}\n\n(ลงชื่อ) เจ้าพนักงานท้องถิ่น\nเทศบาลตำบลเมืองเก่า`;
    
    document.getElementById('letterText').value = letter;
    document.getElementById('letterModal').classList.add('show');
}

function closeLetter() {
    document.getElementById('letterModal').classList.remove('show');
}

async function copyLetter() {
    const text = document.getElementById('letterText');
    try {
        await navigator.clipboard.writeText(text.value);
        alert('✅ คัดลอกแล้ว');
    } catch {
        text.select();
        document.execCommand('copy');
        alert('✅ คัดลอกแล้ว');
    }
}

// ─── Home / Nav ─────────────────────────────────────────
function showHome() {
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('checklistContent').style.display = 'none';
    document.getElementById('lawContent').innerHTML = 
        '<p style="color:var(--muted);font-size:0.85rem;">คลิกที่ link สีฟ้าใน checklist เพื่อดูรายละเอียดกฎหมาย</p>';
}

function loadHome() {
    document.getElementById('checklistSelect').value = '';
    localStorage.removeItem('checklist-selected');
    showHome();
}

// ─── Dashboard nav ─────────────────────────────────────
function goToDashboard() {
    window.location.href = '/dashboard';
}

// ─── Keyboard shortcuts ────────────────────────────────
document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.focus();
    }
    if (e.key === 'Escape') {
        closeLetter();
        document.getElementById('searchResults')?.classList.remove('show');
    }
});

// ─── Utility ────────────────────────────────────────────
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

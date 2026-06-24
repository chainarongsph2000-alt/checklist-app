/**
 * app.js — Checklist App: ตรวจแบบอาคาร
 * เทศบาลตำบลเมืองเก่า
 */

// ─── State ────────────────────────────────────────────────
let currentChecklist = null;
let failedItems = [];

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
        const lists = await res.json();
        const sel = document.getElementById('checklistSelect');
        lists.forEach(l => {
            const opt = document.createElement('option');
            opt.value = l.id;
            opt.textContent = l.title;
            sel.appendChild(opt);
        });
    } catch (e) {
        console.error('Failed to load checklists:', e);
    }
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
    
    // Save selection
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
            `<div class="card"><p style="color:var(--danger);">❌ โหลด checklist ไม่สำเร็จ: ${e.message}</p></div>`;
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
            <button class="btn btn-success" onclick="generateLetter('passed')">📄 ร่างหนังสือแจ้งผ่าน</button>
            <button class="btn btn-danger" onclick="generateLetter('failed')">📄 ร่างหนังสือแจ้งแก้ไข</button>
            <button class="btn btn-ghost" onclick="clearChecks()">🔄 รีเซ็ต</button>
        </div>
    </div>`;
    
    panel.innerHTML = html;
    attachCheckboxListeners(savedChecks);
    updateSummary();
}

// ─── Persist check state (localStorage) ───────────────────
function getStorageKey(filename) {
    return `checklist-state-${filename}`;
}

function getSavedChecks(filename) {
    try {
        const saved = localStorage.getItem(getStorageKey(filename));
        return saved ? JSON.parse(saved) : {};
    } catch {
        return {};
    }
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
        // Restore saved state
        if (savedChecks[i] !== undefined) {
            cb.checked = savedChecks[i];
        }
        cb.addEventListener('change', function() {
            if (currentChecklist) {
                saveCheckState(currentChecklist.filename, getCheckIndex(this), this.checked);
            }
            updateSummary();
        });
    });
}

// ─── Clear saved checks ───────────────────────────────────
function clearChecks() {
    if (!currentChecklist) return;
    if (!confirm('รีเซ็ต checkbox ทั้งหมด?')) return;
    
    localStorage.removeItem(getStorageKey(currentChecklist.filename));
    
    document.querySelectorAll('.check-item').forEach(cb => {
        cb.checked = false;
    });
    updateSummary();
}

// ─── Update summary ────────────────────────────────────────
function updateSummary() {
    const checkboxes = document.querySelectorAll('.check-item');
    const total = checkboxes.length;
    let passed = 0;
    let failed = 0;
    
    checkboxes.forEach(cb => {
        const label = cb.closest('.check-label') || cb.parentElement;
        if (cb.checked) {
            passed++;
            label?.classList.add('passed');
            label?.classList.remove('failed');
        } else {
            failed++;
            label?.classList.add('failed');
            label?.classList.remove('passed');
        }
    });
    
    document.getElementById('passedCount').textContent = passed;
    document.getElementById('failedCount').textContent = failed;
    document.getElementById('totalCount').textContent = total;
    
    failedItems = [];
    document.querySelectorAll('.check-item:not(:checked)').forEach(cb => {
        const label = cb.closest('.check-label') || cb.parentElement;
        if (label) failedItems.push(label.textContent.trim().split('\n')[0]);
    });
}

// ─── Show law in sidebar ──────────────────────────────────
async function showLaw(lawPath) {
    const panel = document.getElementById('lawContent');
    panel.innerHTML = '<div class="loading spinner"> กำลังโหลด...</div>';
    try {
        // Encode each path segment separately (keep / as separator)
        const encodedPath = lawPath.split('/').map(s => encodeURIComponent(s)).join('/');
        const res = await fetch(`/api/law/${encodedPath}`);
        if (!res.ok) {
            panel.innerHTML = `<p style="color:var(--danger);">❌ ไม่พบ: ${lawPath}</p>`;
            return;
        }
        const data = await res.json();
        if (data.error) {
            panel.innerHTML = `<p style="color:var(--danger);">❌ ${data.error}</p>`;
            return;
        }
        panel.innerHTML = data.html || '<p>ไม่พบเนื้อหา</p>';
    } catch(e) {
        panel.innerHTML = `<p style="color:var(--danger);">❌ Error: ${e.message}</p>`;
    }
}

// Intercept law link clicks (event delegation)
document.addEventListener('click', function(e) {
    const link = e.target.closest('.law-link');
    if (link) {
        e.preventDefault();
        const href = link.getAttribute('href').replace('/api/law/', '');
        showLaw(href);
    }
});

// ─── Search ────────────────────────────────────────────────
let searchTimeout;
let searchAbortController = null;

function searchLaw(q) {
    clearTimeout(searchTimeout);
    const results = document.getElementById('searchResults');
    if (q.length < 2) { results.classList.remove('show'); return; }
    
    searchTimeout = setTimeout(async () => {
        // Abort previous search
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
            if (e.name !== 'AbortError') {
                console.error('Search error:', e);
            }
        }
    }, 300);
}

// Close search on outside click
document.addEventListener('click', function(e) {
    if (!e.target.closest('.search-wrapper')) {
        document.getElementById('searchResults').classList.remove('show');
    }
});

// ─── Generate letter ─────────────────────────────────────────
function generateLetter(mode) {
    if (!currentChecklist) return;
    const now = new Date();
    const dateStr = now.toLocaleDateString('th-TH', { 
        year: 'numeric', month: 'long', day: 'numeric' 
    });
    
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

// ─── Home ────────────────────────────────────────────────────
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

// ─── Keyboard shortcuts ─────────────────────────────────────
document.addEventListener('keydown', function(e) {
    // Ctrl+F => focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        document.getElementById('searchInput').focus();
    }
    // Escape => close modal / search
    if (e.key === 'Escape') {
        closeLetter();
        document.getElementById('searchResults').classList.remove('show');
    }
});

// ─── Utility ────────────────────────────────────────────────
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

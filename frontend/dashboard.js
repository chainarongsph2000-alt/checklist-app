/**
 * dashboard.js — Dashboard visualization
 */
document.addEventListener('DOMContentLoaded', loadDashboard);

async function loadDashboard() {
    try {
        const res = await fetch('/api/dashboard/stats');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        renderDashboard(data);
    } catch (e) {
        document.getElementById('dashboardContent').innerHTML = `
            <div class="empty-state">
                <h2>❌ โหลดข้อมูลไม่สำเร็จ</h2>
                <p>${e.message}</p>
                <p style="margin-top:1rem;font-size:0.85rem;color:var(--muted);">ยังไม่มีข้อมูลการตรวจ หรือลองตรวจแบบก่อน แล้วกลับมาดู</p>
                <a href="/" class="btn btn-primary" style="margin-top:1rem;text-decoration:none;">← กลับไปตรวจแบบ</a>
            </div>`;
    }
}

function renderDashboard(data) {
    const passed = data.total_passed_items || 0;
    const failed = data.total_failed_items || 0;
    const totalItems = passed + failed;
    const passRate = totalItems > 0 ? Math.round((passed / totalItems) * 100) : 0;

    const html = `
        <div class="dashboard-header">
            <h1>📊 สถิติการตรวจแบบ</h1>
        </div>

        <div class="stats-grid">
            <div class="stat-card blue">
                <div class="num">${data.total_inspections}</div>
                <div class="label">✅ ครั้งที่ตรวจ</div>
            </div>
            <div class="stat-card green">
                <div class="num">${data.completed}</div>
                <div class="label">📋 เสร็จสมบูรณ์</div>
            </div>
            <div class="stat-card yellow">
                <div class="num">${passRate}%</div>
                <div class="label">📈 อัตราผ่าน</div>
            </div>
            <div class="stat-card red">
                <div class="num">${failed}</div>
                <div class="label">❌ รายการที่ไม่ผ่าน</div>
            </div>
        </div>

        <div class="charts-grid">
            <div class="card">
                <div class="card-title">📈 แนวโน้มรายเดือน</div>
                <canvas id="trendChart" height="200"></canvas>
            </div>
            <div class="card">
                <div class="card-title">🏠 ประเภทอาคาร</div>
                <canvas id="typeChart" height="200"></canvas>
            </div>
        </div>

        <div class="card">
            <div class="card-title">📋 ประวัติการตรวจล่าสุด</div>
            ${data.recent && data.recent.length > 0 ? `
            <table class="recent-table">
                <thead><tr>
                    <th>วันที่</th><th>ประเภทอาคาร</th><th>ผ่าน</th><th>ไม่ผ่าน</th><th>สถานะ</th>
                </tr></thead>
                <tbody>
                    ${data.recent.map(r => `
                    <tr>
                        <td>${formatDate(r.created_at)}</td>
                        <td>${r.checklist_title}</td>
                        <td><span class="pass-badge ok">${r.passed}</span></td>
                        <td><span class="pass-badge fail">${r.failed}</span></td>
                        <td>${r.status === 'completed' ? '✅ เสร็จ' : '⏳ กำลังตรวจ'}</td>
                    </tr>`).join('')}
                </tbody>
            </table>` : '<p style="color:var(--muted);">ยังไม่มีประวัติการตรวจ</p>'}
        </div>
    `;

    document.getElementById('dashboardContent').innerHTML = html;
    
    if (data.trend && data.trend.length > 0) renderTrendChart(data.trend);
    if (data.by_type && data.by_type.length > 0) renderTypeChart(data.by_type);
}

function renderTrendChart(trend) {
    const ctx = document.getElementById('trendChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: trend.map(t => t.month),
            datasets: [{
                label: 'จำนวนตรวจ',
                data: trend.map(t => t.cnt),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.3,
                pointRadius: 4,
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } },
                y: { ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: '#1e293b' } }
            }
        }
    });
}

function renderTypeChart(types) {
    const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
    const ctx = document.getElementById('typeChart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: types.map(t => t.checklist_title),
            datasets: [{
                data: types.map(t => t.cnt),
                backgroundColor: colors.slice(0, types.length),
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#e2e8f0', font: { size: 11 }, boxWidth: 12, padding: 8 }
                }
            }
        }
    });
}

function formatDate(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', time: 'short' });
}

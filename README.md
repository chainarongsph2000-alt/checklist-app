# 📋 Checklist ตรวจแบบอาคาร — เทศบาลตำบลเมืองเก่า

FastAPI + vanilla JS Web App สำหรับตรวจแบบแปลนอาคาร อ่าน checklist จาก Obsidian vault โดยตรง

## 🚀 Quick Start

```bash
# Local dev
cd checklist-app/backend
pip install -r requirements.txt
uvicorn backend.main:app --host 0.0.0.0 --port 8888 --reload

# หรือ Docker
docker compose up -d
```

เปิด browser → [http://localhost:8888](http://localhost:8888)

## 🏗️ สถาปัตยกรรม

```
checklist-app/
├── backend/
│   ├── main.py          ← FastAPI app + router registration
│   ├── config.py        ← Config paths & validation
│   ├── md_parser.py     ← Markdown → HTML (wikilinks + checkboxes)
│   ├── routers/
│   │   ├── checklists.py   ← /api/checklists, /api/checklist/{id}
│   │   ├── law.py          ← /api/law/{path} (sanitized)
│   │   └── search.py       ← /api/search?q=...
│   └── requirements.txt
├── frontend/
│   ├── index.html       ← Main page (slim)
│   ├── style.css        ← All styles
│   └── app.js           ← All logic (localStorage persist)
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## 🔌 API Endpoints

| Method | Path | คำอธิบาย |
|--------|------|----------|
| GET | `/` | หน้าเว็บหลัก |
| GET | `/health` | Health check |
| GET | `/api/checklists` | รายการ checklist ทั้งหมด |
| GET | `/api/checklist/{id}` | เนื้อหา checklist |
| GET | `/api/law/{path}` | ดึงเนื้อหากฎหมาย (path sanitized) |
| GET | `/api/search?q=...` | ค้นหากฎหมายใน vault |

## ✨ Features

- ✅ เลือกประเภทอาคาร → แสดง checklist
- ✅ Check box + localStorage persist (ปิด browser แล้วไม่หาย)
- ✅ คลิก link → ดูกฎหมายด้านข้าง
- ✅ ค้นหากฎหมายทุกไฟล์ใน vault
- ✅ ร่างหนังสือแจ้ง (ผ่าน / ไม่ผ่าน) + คัดลอก
- ✅ Keyboard shortcuts: `Ctrl+F` → ค้นหา, `ESC` → ปิด modal
- ✅ Responsive design (mobile-ready)
- ✅ Docker support

## 📝 Source

Vault: `/root/Documents/obsidian-vault/กฎหมาย/`

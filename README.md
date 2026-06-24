# 📋 Checklist ตรวจแบบอาคาร — เทศบาลตำบลเมืองเก่า

> **Version 1.00** 🚀
> FastAPI + vanilla JS Web App สำหรับตรวจแบบแปลนอาคาร อ่าน checklist จาก Obsidian vault โดยตรง

---

## 🚀 Quick Start

```bash
# 1. ใช้ systemd (auto start เมื่อ reboot)
systemctl start checklist-app
systemctl enable checklist-app

# 2. หรือใช้ Docker
cd checklist-app && docker compose up -d
```

เปิด browser → [http://localhost:8888](http://localhost:8888)

หรือเข้า VPS → [http://61.47.10.164:8888](http://61.47.10.164:8888)

---

## 📖 API Documentation

FastAPI built-in docs:
- **Swagger UI:** [http://localhost:8888/docs](http://localhost:8888/docs)
- **OpenAPI JSON:** [http://localhost:8888/openapi.json](http://localhost:8888/openapi.json)

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
│   ├── app.js           ← All logic (localStorage persist)
│   └── favicon.svg      ← Tab icon
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## 🔌 API Endpoints

| Method | Path | คำอธิบาย |
|--------|------|----------|
| GET | `/` | หน้าเว็บหลัก |
| GET | `/health` | Health check |
| GET | `/docs` | Swagger API docs |
| GET | `/openapi.json` | OpenAPI spec |
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
- ✅ Systemd service (auto start on reboot)
- ✅ API docs via Swagger UI
- ✅ Path traversal protection

## 🛠️ Management

```bash
# ดูสถานะ service
systemctl status checklist-app

# รีสตาร์ท
systemctl restart checklist-app

# ดู logs
journalctl -u checklist-app -f

# รันแบบ dev
cd checklist-app/backend
uvicorn backend.main:app --reload
```

## 📝 Source

Vault: `/root/Documents/obsidian-vault/กฎหมาย/`

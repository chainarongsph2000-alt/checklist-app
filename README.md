FastAPI Backend — อ่าน checklist จาก Obsidian vault

## สิ่งที่ต้องติดตั้ง

```bash
pip install fastapi uvicorn python-multipart markdown
```

## โครงสร้าง

```
checklist-app/
├── backend/
│   ├── main.py          ← FastAPI server
│   ├── checklist.py     ← โหลด/แปลง .md → JSON
│   └── templates/       ← (ถ้าต้องการ)
├── frontend/
│   ├── index.html       ← หน้าเลือกประเภท
│   ├── checklist.html   ← หน้า checklist + check
│   └── assets/
│       ├── style.css
│       └── app.js
└── data/
    └── symlink → vault  ← link ไป vault จริง
```

## API endpoints

| Method | Path | คำอธิบาย |
|--------|------|----------|
| GET | `/api/checklists` | รายการ checklist ทั้งหมด |
| GET | `/api/checklist/{id}` | เนื้อหา checklist ที่เลือก |
| GET | `/api/search?q=คำค้น` | ค้นหากฎหมายใน vault |
| GET | `/api/law/{path}` | ดึงเนื้อหากฎหมายที่ link ไป |

## วิธีรัน

```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8888 --reload
```

เปิด browser → http://localhost:8888

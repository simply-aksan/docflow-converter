# DocFlow — Modern Word to PDF Batch Converter

A high-fidelity Word (.docx / .doc) to PDF batch conversion web application built with a decoupled architecture:
- **Frontend**: React + Vite + TypeScript + Tailwind CSS (Optimized for **Vercel**)
- **Backend**: Python FastAPI + Headless LibreOffice in Docker (Optimized for **Render** / **Railway**)

---

## 📁 Struktur Direktori

```text
converter/
├── client/                     # Frontend (Deploy ke Vercel)
│   ├── src/
│   │   ├── components/         # Dropzone, FileCard, BatchActionBar, Header, TrustBadges
│   │   ├── config.ts           # Konfigurasi API URL
│   │   ├── types.ts            # TypeScript interfaces
│   │   └── App.tsx             # State & alur batch conversion
│   ├── package.json
│   └── vite.config.ts
│
├── server/                     # Backend (Deploy ke Render / Railway)
│   ├── app/
│   │   ├── api/                # Endpoint /api/convert/batch, /single, /download
│   │   ├── services/           # LibreOffice conversion engine & auto-cleaner
│   │   ├── config.py           # Konfigurasi CORS & limitasi file
│   │   └── main.py             # FastAPI entrypoint
│   ├── Dockerfile              # Container Linux + LibreOffice + TrueType Fonts
│   └── requirements.txt
│
└── README.md
```

---

## 🚀 Panduan Menjalankan di Lokal (Development)

### 1. Backend (FastAPI)
```bash
cd server

# Aktifkan virtual environment
# Windows PowerShell:
.\venv\Scripts\Activate.ps1

# Linux / Mac:
# source venv/bin/activate

# Jalankan server uvicorn
uvicorn app.main:app --reload --port 8000
```
API Docs interaktif akan tersedia di: `http://localhost:8000/docs`

> *Catatan Lokal:* Untuk konversi sebenarnya di Windows lokal, pastikan LibreOffice terpasang di sistem. Di lingkungan produksi (Render), LibreOffice dan font Linux terpasang otomatis via Dockerfile.

### 2. Frontend (React + Vite)
Buka terminal baru:
```bash
cd client
npm run dev
```
Buka browser di `http://localhost:5173`

---

## 🌐 Panduan Step-by-Step Deployment ke Cloud

### Langkah 1: Push Project ke GitHub
1. Buat repository baru di akun GitHub Anda (misal: `docflow-converter`).
2. Di folder root project (`converter`), jalankan:
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit for docflow word to pdf converter"
   git branch -M main
   git remote add origin https://github.com/USERNAME/docflow-converter.git
   git push -u origin main
   ```

---

### Langkah 2: Deploy Backend ke Render (Docker Web Service)
1. Buka [dashboard.render.com](https://dashboard.render.com) dan login.
2. Klik tombol **New +** $\rightarrow$ pilih **Web Service**.
3. Hubungkan repository GitHub Anda.
4. Konfigurasikan:
   - **Name**: `docflow-backend` (atau nama pilihan Anda)
   - **Root Directory**: `server`
   - **Environment**: **Docker** (Render akan otomatis mendeteksi `Dockerfile` di folder `server`)
   - **Instance Type**: **Free**
5. Buka tab **Environment Variables** di Render, lalu tambahkan:
   - `ALLOWED_ORIGINS`: `*` *(atau isi dengan URL Vercel Anda nanti setelah frontend terdeploy)*
   - `FILE_RETENTION_MINUTES`: `30`
   - `MAX_FILE_SIZE_MB`: `50`
6. Klik **Create Web Service**. Tunggu proses build Docker selesai (mengunduh LibreOffice dan font).
7. Salin URL backend yang diberikan Render, contoh: `https://docflow-backend.onrender.com`.

---

### Langkah 3: Deploy Frontend ke Vercel
1. Buka [vercel.com](https://vercel.com) dan login.
2. Klik **Add New...** $\rightarrow$ **Project**.
3. Import repository GitHub Anda.
4. Pada halaman konfigurasi project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Klik **Edit** dan pilih folder **`client`**
5. Buka bagian **Environment Variables**:
   - Key: `VITE_API_URL`
   - Value: `https://docflow-backend.onrender.com` *(Ganti dengan URL dari Langkah 2)*
6. Klik **Deploy**.
7. Dalam 1-2 menit, web frontend Anda aktif di URL Vercel (misal: `https://docflow-converter.vercel.app`).

---

### Langkah 4: Kunci Keamanan CORS (Opsional & Direkomendasikan)
Setelah frontend Vercel selesai dibuat:
1. Kembali ke dashboard Render $\rightarrow$ Environment Variables.
2. Ubah `ALLOWED_ORIGINS` dari `*` menjadi domain frontend Anda:
   `https://docflow-converter.vercel.app`
3. Simpan perubahan.

# 🕌 MyMosque App

Aplikasi Manajemen Masjid & Zakat berbasis Node.js, Express, EJS, Tailwind CSS, dan SQLite. Dilengkapi dengan kalkulator Zakat Fitrah & Fidyah Dinamis, manajemen inventaris/pengaturan, serta sistem keamanan tingkat lanjut berbasis **RBAC (Role-Based Access Control) & Granular Permissions** yang dinamis.

---

## 🚀 Fitur Utama
- **Modul Zakat & Fidyah Otomatis:** Perhitungan zakat fitrah dan logika kombinasi fidyah (beras/uang) yang akurat dan saling menggenapi.
- **Dynamic RBAC & Permissions:** Pengaturan hak akses modul per pengguna secara fleksibel dan terpusat.
- **Keamanan Enterprise:** Enkripsi kata sandi menggunakan `bcrypt` dan manajemen sesi berbasis server.
- **Widget Real-Time:** Jam digital real-time dan teks berjalan (*running text*) informasi masjid.
- **Struktur Ringan:** Menggunakan SQLite sehingga sangat mudah di-deploy tanpa konfigurasi database server yang rumit.

---

## 🛠️ Panduan Instalasi & Deployment (Production / Server)

Ikuti langkah-langkah di bawah ini untuk menginstal dan menjalankan aplikasi MyMosque di server Linux (VPS Ubuntu/Debian):

### 1. Prasyarat Server
Pastikan server Anda sudah terpasang:
- **Node.js** (Versi LTS direkomendasikan)
- **Git**

### 2. Clone Repository & Install Paket
Buka terminal server Anda, lalu jalankan perintah berikut secara berurutan:

```bash
# 1. Download kode dari GitHub
git clone [https://github.com/deepstruct-ilyasa/mymosque-app.git](https://github.com/deepstruct-ilyasa/mymosque-app.git)

# 2. Masuk ke dalam folder project
cd mymosque-app

# 3. Install semua modul/paket yang dibutuhkan
npm install

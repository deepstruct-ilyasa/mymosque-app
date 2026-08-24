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
```

### 3. Konfigurasi Systemd Service (Agar Jalan Otomatis di Latar Belakang)
Agar aplikasi tetap berjalan stabil, otomatis menyala saat server reboot, dan hidup kembali jika terjadi crash, kita dapat mendaftarkannya sebagai layanan sistem Linux (systemd).
- Buat file service baru:
  ```bash
  sudo nano /etc/systemd/system/mymosque.service
  ```
- Salin dan tempel konfigurasi berikut (sesuaikan path direktori /root/var/www/mymosque-app jika Anda meletakkannya di folder lain):
  ```bash
  [Unit]
  Description=MyMosque Application
  After=network.target
  
  [Service]
  Type=simple
  User=root
  WorkingDirectory=/root/var/www/mymosque-app
  ExecStart=/usr/bin/node app.js
  Restart=always
  RestartSec=10
  StandardOutput=syslog
  StandardError=syslog
  SyslogIdentifier=mymosque
  Environment=NODE_ENV=production
  Environment=PORT=3000
  
  [Install]
  WantedBy=multi-user.target
  ```
- Simpan file (Ctrl + O, lalu Enter, kemudian keluar dengan Ctrl + X).

### 4. Daftarkan & Jalankan Service
- Aktifkan dan nyalakan layanan MyMosque dengan perintah:
  ```bash
  # Refresh daemon systemd
  sudo systemctl daemon-reload
  
  # Aktifkan agar otomatis nyala saat server reboot
  sudo systemctl enable mymosque
  
  # Jalankan aplikasi sekarang juga
  sudo systemctl start mymosque
  ```

### 5. Cek Status Aplikasi
  Untuk memastikan aplikasi berjalan dengan mulus tanpa kendala:
  ```bash
  sudo systemctl status mymosque
  ```

## 🔑 Login Default (Pertama Kali)
  Saat pertama kali dijalankan, sistem akan otomatis membuatkan database dan akun Super Admin default:
  - Username: **admin**
  - Password: **admin123**

  ⚠️ Saran Keamanan: Segera login ke panel admin, lalu buat akun baru atau ubah pengaturan demi keamanan operasional Anda.
# 🕌 MyMosque App

Aplikasi Manajemen Masjid & Zakat berbasis Node.js, Express, EJS, Tailwind CSS, dan SQLite. Dilengkapi dengan kalkulator Zakat Fitrah & Fidyah Dinamis, manajemen inventaris/pengaturan, serta sistem keamanan tingkat lanjut berbasis **RBAC (Role-Based Access Control) & Granular Permissions** yang dinamis.

---

## 🚀 Fitur Utama & Modul Sistem

1. **Modul Manajemen Keuangan & Kas Masjid (`finance.db`)**
   - **Pencatatan Transaksi:** Pengelolaan kas masuk dan kas keluar lengkap dengan lampiran file bukti transaksi.
   - **Sistem Tutup Buku & Snapshot Arsip (`monthly_closings`):** Mengunci laporan keuangan bulanan secara permanen untuk menjaga integritas historis data. Sistem secara otomatis menyalin dan mengamankan logo lembaga khusus untuk periode tersebut.
   - **Pusat Arsip & Laporan (Report Center):** Navigasi berbasis kartu interaktif untuk melihat kembali, mencetak, atau mengedit data arsip laporan bulan-bulan sebelumnya secara independen tanpa saling mempengaruhi.
   - **Cetak Laporan PDF A4 Profesional:** Tata letak dokumen resmi lengkap dengan Kop Surat dinamis dan tanda tangan ganda (Ketua & Bendahara/Sekretaris) beserta opsi input jabatan *Custom*.

2. **Modul Zakat & Fidyah Otomatis (`zakat_db`)**
   - **Wizard Setup Agenda Baru:** Pengaturan standar besaran Zakat Fitrah (beras/uang), Fidyah, dan Nisab Zakat Mal yang disesuaikan per periode/tahun hijriyah.
   - **Kalkulator Kombinasi Akurat:** Perhitungan otomatis jumlah jiwa, konversi beras, uang tunai, hingga kelebihan pembayaran yang otomatis dikalkulasikan sebagai Infaq/Sedekah.
   - **Cetak Rekapitulasi Zakat A4:** Format laporan multi-halaman berstandar cetak profesional dengan pembagian ringkasan eksekutif dan rincian per kategori muzakki.

3. **Modul Pengaturan Sistem & Identitas (`app_settings.db`)**
   - **Identitas Terpusat:** Pengaturan nama masjid, alamat lengkap, nomor telepon/kontak, zona waktu, dan logo utama aplikasi yang otomatis menjadi nilai *default* cerdas bagi modul keuangan dan zakat.

4. **Keamanan & Kontrol Akses Enterprise**
   - **Dynamic RBAC & Granular Permissions:** Pengaturan hak akses modul per pengguna secara fleksibel.
   - **Enkripsi Keamanan:** Perlindungan sandi menggunakan `bcrypt` dan manajemen sesi berbasis server.

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
  WorkingDirectory=/path-anda/mymosque-app
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
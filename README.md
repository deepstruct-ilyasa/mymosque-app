# 🕌 MyMosque App

Aplikasi Manajemen Masjid & Zakat berbasis Node.js, Express, EJS, Tailwind CSS, dan SQLite. Dilengkapi dengan kalkulator Zakat Fitrah & Fidyah Dinamis, manajemen inventaris/pengaturan, sistem keamanan tingkat lanjut berbasis RBAC (Role-Based Access Control), serta **Modul Display Jadwal Sholat & Audio Tarkhim Sekuensial Berbasis Waktu Sholat** yang modern dan modular.

---

## 🚀 Fitur Utama & Modul Sistem

### 1. 🖥️ Modul Display Sholat & Audio Tarkhim Modular (`display.db`)
* **Pengaturan Universal Berbasis Per Waktu Sholat:** Memisahkan konfigurasi secara granular untuk 6 waktu sholat: **Shubuh, Dzuhur, Jum'at, Ashar, Maghrib, dan Isya**. Masing-masing waktu memiliki parameter mandiri:
  * Hitung mundur persiapan adzan (*prep adzan* dalam detik).
  * Durasi hitung mundur iqomah (dalam menit).
  * Durasi mode sholat berlangsung (dalam menit).
  * Durasi mulai pemutaran audio tarkhim otomatis (*prep tarkhim* dalam detik).
* **Pemisahan Dzuhur & Jum'at:** Hari Jumat memiliki entitas dan pengaturan waktu, durasi khutbah, serta playlist audionya sendiri secara terpisah dari hari biasa.
* **Toggle ON/OFF Tarkhim per Sholat:** Fitur sakelar fleksibel di panel admin untuk menghidupkan atau mematikan pemutaran audio tarkhim di waktu sholat tertentu secara instan.
* **Manajemen Audio Tarkhim Terisolasi & Kalkulator Durasi Otomatis:** 
  * Unggah file audio (MP3/WAV) secara spesifik untuk masing-masing waktu sholat.
  * Sistem secara otomatis membaca metadata file audio saat diunggah dan mengakumulasikan total durasi detik tarkhim secara *real-time*.
  * Fitur hapus audio via AJAX instan tanpa *refresh* halaman, yang langsung mengalkulasi ulang durasi detik di database.
* **Pemutar Audio Sekuensial di TV Display:** Pemutaran file audio tarkhim berurutan secara otomatis berdasarkan antrean playlist spesifik per sholat.
* **Running Text & Jadwal Kemenag Real-Time:** Integrasi otomatis jadwal sholat harian berdasarkan kota/wilayah serta teks pengumuman berjalan (*running text*) dinamis.

### 2. 💰 Modul Manajemen Keuangan & Kas Masjid (`finance.db`)
* **Pencatatan Transaksi:** Pengelolaan kas masuk dan kas keluar lengkap dengan lampiran file bukti transaksi.
* **Sistem Tutup Buku & Snapshot Arsip (`monthly_closings`):** Mengunci laporan keuangan bulanan secara permanen untuk menjaga integritas historis data, lengkap dengan pengamanan logo lembaga khusus periode tersebut.
* **Pusat Arsip & Laporan (Report Center):** Navigasi kartu interaktif untuk melihat, mencetak, atau mengedit data arsip laporan bulan-bulan sebelumnya secara independen.
* **Cetak Laporan PDF A4 Profesional:** Tata letak dokumen resmi dengan kop surat dinamis, tanda tangan ganda (Ketua & Bendahara/Sekretaris), serta opsi input jabatan custom.

### 3. 🌾 Modul Zakat & Fidyah Otomatis (`zakat_db`)
* **Wizard Setup Agenda Baru:** Pengaturan standar besaran Zakat Fitrah (beras/uang), Fidyah, dan Nisab Zakat Mal per periode/tahun Hijriyah.
* **Kalkulator Kombinasi Akurat:** Perhitungan otomatis jumlah jiwa, konversi beras, uang tunai, hingga kelebihan pembayaran yang otomatis dikalkulasikan sebagai Infaq/Sedekah.
* **Cetak Rekapitulasi Zakat A4:** Format laporan multi-halaman berstandar cetak profesional dengan pembagian ringkasan eksekutif dan rincian per kategori muzakki.

### 4. ⚙️ Modul Pengaturan Sistem & Identitas (`app_settings.db`)
* **Identitas Terpusat:** Pengaturan nama masjid, alamat lengkap, kontak, zona waktu, dan logo utama aplikasi yang otomatis menjadi nilai *default* cerdas bagi seluruh modul.

### 5. 🔒 Keamanan & Kontrol Akses Enterprise
* **Dynamic RBAC & Granular Permissions:** Pengaturan hak akses modul per pengguna secara fleksibel.
* **Enkripsi Keamanan:** Perlindungan sandi menggunakan `bcrypt` dan manajemen sesi berbasis server.

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
git clone https://github.com/deepstruct-ilyasa/mymosque-app.git

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

  ⚠️ Saran Keamanan: Segera login ke panel admin, lalu buat akun baru atau ubah password demi keamanan operasional Anda.
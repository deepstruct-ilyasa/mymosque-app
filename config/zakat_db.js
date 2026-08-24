const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database/zakat.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('❌ Gagal koneksi:', err.message);
});

db.run("PRAGMA foreign_keys = ON;");

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS event (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nama_event TEXT NOT NULL,
        deskripsi TEXT,
        nama_lembaga TEXT,        -- Contoh: MASJID AL-MUHARRAR
        sub_lembaga TEXT,         -- Contoh: PANITIA ZAKAT FITRAH 1447 H
        telepon TEXT,             -- Nomor Telepon / Kontak
        alamat TEXT,              -- Alamat Sekretariat
        logo TEXT,                -- Nama file logo
        ketua TEXT,               -- 'Ketua Takmir' atau 'Ketua Panitia'
        nama_ketua TEXT,          -- Nama Ketua Panitia
        sub_ketua TEXT,           -- 'Sekretaris' atau 'Bendahara'
        nama_sub_ketua TEXT,      -- Nama lengkapnya
        standar_fitrah_beras REAL DEFAULT 2.5,
        standar_fitrah_uang REAL DEFAULT 40000,
        standar_fidyah_beras REAL DEFAULT 0.6,
        standar_fidyah_uang REAL DEFAULT 30000,
        nisab_zakat_mal REAL DEFAULT 85000000,
        status TEXT DEFAULT 'Aktif',
        tanggal_dibuat DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabel transactions dengan kolom infaq_beras dan infaq_uang terpisah
    db.run(`CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        nama_penyetor TEXT NOT NULL,
        jumlah_jiwa INTEGER DEFAULT 0,
        jenis_zakat TEXT NOT NULL,
        jenis_bayar TEXT NOT NULL,
        jiwa_beras INTEGER DEFAULT 0,
        jumlah_beras REAL DEFAULT 0,
        infaq_beras REAL DEFAULT 0,
        jiwa_uang INTEGER DEFAULT 0,
        jumlah_uang REAL DEFAULT 0,
        infaq_uang REAL DEFAULT 0,
        tanggal DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (event_id) REFERENCES event (id) ON DELETE CASCADE
    )`);
});

module.exports = db;
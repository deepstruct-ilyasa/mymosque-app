const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../database/finance.db');

if (!fs.existsSync(path.dirname(dbPath))) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Gagal koneksi ke database finance:', err.message);
    } else {
        console.log('✅ Terhubung ke database Keuangan (finance.db).');
    }
});

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nama_kategori TEXT NOT NULL,
            jenis TEXT CHECK(jenis IN ('masuk', 'keluar')) NOT NULL
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tanggal TEXT NOT NULL,
            jenis TEXT CHECK(jenis IN ('masuk', 'keluar')) NOT NULL,
            kategori_id INTEGER,
            jumlah REAL NOT NULL,
            lampiran TEXT,
            keterangan TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (kategori_id) REFERENCES categories(id)
        )
    `);

    // TABEL MONTHLY CLOSINGS DIPERBARUI: Menyimpan Saldo + Data Kop Surat & Tanda Tangan
    db.run(`
        CREATE TABLE IF NOT EXISTS monthly_closings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bulan INTEGER NOT NULL,
            tahun INTEGER NOT NULL,
            saldo_akhir REAL NOT NULL,
            nama_masjid TEXT,
            sub_judul TEXT,
            alamat TEXT,
            telepon TEXT,
            logo TEXT,
            nama_ketua TEXT,
            jabatan_ketua TEXT,
            nama_subketua TEXT,
            jabatan_subketua TEXT,
            closed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(bulan, tahun)
        )
    `);
});

module.exports = db;
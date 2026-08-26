const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database/finance.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Gagal terhubung ke database keuangan:', err.message);
    } else {
        console.log('✅ Berhasil terhubung ke database keuangan (finance.db)');
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

    // TABEL BARU: Untuk mencatat status bulan yang sudah ditutup buku (dikunci)
    db.run(`
        CREATE TABLE IF NOT EXISTS monthly_closings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bulan INTEGER NOT NULL,
            tahun INTEGER NOT NULL,
            saldo_akhir REAL NOT NULL,
            closed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(bulan, tahun)
        )
    `, (err) => {
        if (err) {
            console.error('❌ Gagal membuat tabel closing:', err.message);
        } else {
            console.log('📁 Tabel keuangan, kategori, dan monthly_closings siap digunakan.');
        }
    });
});

module.exports = db;
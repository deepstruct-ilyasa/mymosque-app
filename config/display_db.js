const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database/display.db');
const displayDb = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('❌ Gagal koneksi ke database display_db:', err.message);
    else console.log('✅ Terhubung ke database display.db');
});

displayDb.serialize(() => {
    // 1. Tabel Pengaturan Global (Kota & Running Text)
    displayDb.run(`CREATE TABLE IF NOT EXISTS general_settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT
    )`, () => {
        displayDb.get("SELECT COUNT(*) as count FROM general_settings", (err, row) => {
            if (row && row.count === 0) {
                displayDb.run(`INSERT INTO general_settings (key, value) VALUES 
                    ('sholat_city', ''),
                    ('sholat_running_text', ''),
                    ('durasi_adzan_menit', '3'),
                    ('durasi_khutbah_menit', '45')`);
            }
        });
    });

    // 2. Tabel Konfigurasi Sholat Berbasis Baris (Shubuh, Dzuhur/Jum'at, Ashar, Maghrib, Isya)
    displayDb.run(`CREATE TABLE IF NOT EXISTS display_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_sholat INTEGER UNIQUE NOT NULL,
        nama_sholat TEXT NOT NULL,
        prep_tarkhim_detik INTEGER DEFAULT 0,
        tarkhim_active INTEGER DEFAULT 1,
        prep_adzan_detik INTEGER DEFAULT 60,
        iqomah_menit INTEGER DEFAULT 10,
        durasi_sholat_menit INTEGER DEFAULT 15
    )`, () => {
        displayDb.get("SELECT COUNT(*) as count FROM display_settings", (err, row) => {
            if (row && row.count === 0) {
                // Inisialisasi default 5 waktu sholat
                const defaultSholat = [
                    [1, 'Shubuh', 0, 1, 60, 10, 15],
                    [2, 'Dzuhur', 0, 1, 60, 10, 15],
                    [3, "Jum'at", 0, 1, 60, 10, 45],
                    [4, 'Ashar', 0, 1, 60, 10, 15],
                    [5, 'Maghrib', 0, 1, 60, 10, 10],
                    [6, 'Isya', 0, 1, 60, 10, 15]
                ];
                const stmt = displayDb.prepare(`INSERT INTO display_settings (id_sholat, nama_sholat, prep_tarkhim_detik, tarkhim_active, prep_adzan_detik, iqomah_menit, durasi_sholat_menit) VALUES (?, ?, ?, ?, ?, ?, ?)`);
                defaultSholat.forEach(row => stmt.run(row));
                stmt.finalize();
            }
        });
    });

    // 3. Tabel Audio Tarkhim Berelasi dengan id_sholat
    displayDb.run(`CREATE TABLE IF NOT EXISTS tarkhim_audio (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        id_sholat INTEGER NOT NULL,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_sholat) REFERENCES display_settings(id_sholat) ON DELETE CASCADE
    )`);
});

module.exports = displayDb;
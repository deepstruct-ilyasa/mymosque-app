// config/display_db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database/display.db');
const displayDb = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('❌ Gagal koneksi ke database display_db:', err.message);
    else console.log('✅ Terhubung ke database display.db');
});

displayDb.serialize(() => {
    // Tabel Pengaturan Display
    displayDb.run(`CREATE TABLE IF NOT EXISTS display_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT
    )`, () => {
        displayDb.get("SELECT COUNT(*) as count FROM display_settings", (err, row) => {
            if (row && row.count === 0) {
                displayDb.run(`INSERT INTO display_settings (key, value) VALUES 
                    ('sholat_city', ''),
                    ('sholat_running_text', ''),
                    ('iqomah_subuh', '10'),
                    ('iqomah_dzuhur', '10'),
                    ('iqomah_ashar', '10'),
                    ('iqomah_maghrib', '10'),
                    ('iqomah_isya', '10'),
                    ('prep_tarkhim_menit', '10'),
                    ('prep_adzan_subuh', '60'),
                    ('prep_adzan_dzuhur', '60'),
                    ('prep_adzan_ashar', '60'),
                    ('prep_adzan_maghrib', '60'),
                    ('prep_adzan_isya', '60'),
                    ('sholat_duration_subuh', '15'),
                    ('sholat_duration_dzuhur', '15'),
                    ('sholat_duration_ashar', '15'),
                    ('sholat_duration_maghrib', '10'),
                    ('sholat_duration_isya', '15'),
                    ('durasi_adzan_menit', '3'),
                    ('durasi_khutbah_menit', '45')`);
            }
        });
    });

    // Tabel Baru untuk Playlist Audio Tarkhim
    displayDb.run(`CREATE TABLE IF NOT EXISTS tarkhim_audio (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

module.exports = displayDb;
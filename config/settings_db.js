// settings_db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database/app_settings.db');
const settingsDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Gagal koneksi ke database app_settings:', err.message);
    } else {
        console.log('✅ Terhubung ke database app_settings.db');
    }
});

settingsDb.serialize(() => {
    settingsDb.run(`CREATE TABLE IF NOT EXISTS app_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT
    )`, () => {
        // Masukkan data default jika tabel masih kosong
        settingsDb.get("SELECT COUNT(*) as count FROM app_settings", (err, row) => {
            if (row && row.count === 0) {
                settingsDb.run(`INSERT INTO app_settings (key, value) VALUES 
                    ('app_name', 'MyMosque App'),
                    ('mosque_name', ''),
                    ('mosque_address', ''),
                    ('logo', '')`);
            }
        });
    });
});

module.exports = settingsDb;
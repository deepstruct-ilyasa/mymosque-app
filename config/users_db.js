const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

const dbPath = path.resolve(__dirname, '../database/users.db');
const usersDb = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('❌ Gagal koneksi ke database users:', err.message);
    else console.log('✅ Terhubung ke database users.db');
});

usersDb.serialize(() => {
    usersDb.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        nama_lengkap TEXT,
        role TEXT DEFAULT 'Admin',
        permissions TEXT DEFAULT '["dashboard"]',
        foto TEXT DEFAULT NULL
    )`, () => {
        // Migrasi aman jika kolom permissions atau foto belum ada
        usersDb.all("PRAGMA table_info(users)", (err, columns) => {
            const hasPerms = columns.some(col => col.name === 'permissions');
            if (!hasPerms) {
                usersDb.run("ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT '[\"zakat\", \"dashboard\"]'");
            }
            const hasFoto = columns.some(col => col.name === 'foto');
            if (!hasFoto) {
                usersDb.run("ALTER TABLE users ADD COLUMN foto TEXT DEFAULT NULL");
            }
        });

        // Buat Super Admin default jika tabel kosong
        usersDb.get("SELECT COUNT(*) as count FROM users", (err, row) => {
            if (row && row.count === 0) {
                const saltRounds = 10;
                bcrypt.hash('admin123', saltRounds, (err, hashedPassword) => {
                    if (err) return;
                    const allPerms = JSON.stringify(['dashboard', 'zakat', 'settings', 'users']);
                    usersDb.run(
                        `INSERT INTO users (username, password, nama_lengkap, role, permissions, foto) VALUES (?, ?, ?, ?, ?, NULL)`,
                        ['admin', hashedPassword, 'Administrator System', 'Super Admin', allPerms]
                    );
                    console.log('✅ Akun Super Admin default dibuat (admin / admin123)');
                });
            }
        });
    });
});

module.exports = usersDb;
const usersDb = require('../../config/users_db');
const modulesConfig = require('../../config/modules.config');
const bcrypt = require('bcrypt'); // <-- Import bcrypt
const saltRounds = 10;

// 1. Tampilkan Daftar Pengguna
exports.daftarUser = (req, res) => {
    usersDb.all("SELECT id, username, nama_lengkap, role, permissions FROM users", [], (err, users) => {
        if (err) {
            console.error("Gagal mengambil data user:", err.message);
            return res.status(500).send("Database error");
        }
        res.render('user/index', {
            title: 'Manajemen Pengguna',
            users
        });
    });
};

// 2. Tampilkan Form Tambah Pengguna
exports.formTambahUser = (req, res) => {
    res.render('user/tambah', {
        title: 'Tambah Pengguna Baru',
        allModules: modulesConfig
    });
};

// 3. Proses Simpan Pengguna Baru (DI-HASH)
exports.storeUser = (req, res) => {
    const { username, password, nama_lengkap, role, permissions } = req.body;
    
    const permsArray = Array.isArray(permissions) ? permissions : (permissions ? [permissions] : []);
    const permsJson = JSON.stringify(permsArray);

    // Hash password sebelum disimpan
    bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
        if (err) {
            console.error("Gagal enkripsi password:", err);
            return res.status(500).send("Gagal memproses password.");
        }

        const sql = `INSERT INTO users (username, password, nama_lengkap, role, permissions) VALUES (?, ?, ?, ?, ?)`;
        usersDb.run(sql, [username, hashedPassword, nama_lengkap, role || 'Admin', permsJson], (err) => {
            if (err) return res.status(500).send("Gagal menyimpan pengguna (Username mungkin sudah terdaftar).");
            res.redirect('/admin/users');
        });
    });
};

// 4. Tampilkan Form Edit Pengguna
exports.formEditUser = (req, res) => {
    const { id } = req.params;
    usersDb.get("SELECT id, username, nama_lengkap, role, permissions FROM users WHERE id = ?", [id], (err, user) => {
        if (err || !user) return res.status(404).send("Pengguna tidak ditemukan.");
        try {
            user.permissions = JSON.parse(user.permissions || '[]');
        } catch (e) {
            user.permissions = [];
        }
        res.render('user/edit', {
            title: `Edit Pengguna - ${user.nama_lengkap}`,
            user,
            allModules: modulesConfig
        });
    });
};

// 5. Proses Update Pengguna (DI-HASH JIKA PASSWORD DIISI)
exports.updateUser = (req, res) => {
    const { id } = req.params;
    const { username, password, nama_lengkap, role, permissions } = req.body;
    
    const permsArray = Array.isArray(permissions) ? permissions : (permissions ? [permissions] : []);
    const permsJson = JSON.stringify(permsArray);

    if (password && password.trim() !== "") {
        // Jika password diisi, hash password baru
        bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
            if (err) return res.status(500).send("Gagal enkripsi password baru.");

            const sql = `UPDATE users SET username = ?, password = ?, nama_lengkap = ?, role = ?, permissions = ? WHERE id = ?`;
            usersDb.run(sql, [username, hashedPassword, nama_lengkap, role, permsJson, id], (err) => {
                res.redirect('/admin/users');
            });
        });
    } else {
        // Jika password kosong, jangan ubah password lama
        const sql = `UPDATE users SET username = ?, nama_lengkap = ?, role = ?, permissions = ? WHERE id = ?`;
        usersDb.run(sql, [username, nama_lengkap, role, permsJson, id], (err) => {
            res.redirect('/admin/users');
        });
    }
};

// 6. Proses Hapus Pengguna
exports.hapusUser = (req, res) => {
    const { id } = req.params;
    usersDb.run("DELETE FROM users WHERE id = ?", [id], (err) => {
        if (err) {
            console.error("Gagal menghapus user:", err.message);
        }
        res.redirect('/admin/users');
    });
};
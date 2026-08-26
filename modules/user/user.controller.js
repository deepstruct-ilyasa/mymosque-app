const usersDb = require('../../config/users_db');
const modulesConfig = require('../../config/modules.config');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
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

// 3. Proses Simpan Pengguna Baru (DI-HASH, TANPA FOTO)
exports.storeUser = (req, res) => {
    const { username, password, nama_lengkap, role, permissions } = req.body;
    
    const permsArray = Array.isArray(permissions) ? permissions : (permissions ? [permissions] : []);
    const permsJson = JSON.stringify(permsArray);

    bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
        if (err) {
            console.error("Gagal enkripsi password:", err);
            return res.status(500).send("Gagal memproses password.");
        }

        const sql = `INSERT INTO users (username, password, nama_lengkap, role, permissions, foto) VALUES (?, ?, ?, ?, ?, NULL)`;
        usersDb.run(sql, [username, hashedPassword, nama_lengkap, role || 'Admin', permsJson], (err) => {
            if (err) return res.status(500).send("Gagal menyimpan pengguna (Username mungkin sudah terdaftar).");
            res.redirect('/admin/users');
        });
    });
};

// 4. Tampilkan Form Edit Pengguna
exports.formEditUser = (req, res) => {
    const userId = req.params.id;
    
    usersDb.get("SELECT * FROM users WHERE id = ?", [userId], (err, user) => {
        if (err || !user) {
            return res.redirect('/admin/users');
        }

        // Parse teks JSON dari database menjadi Array JavaScript
        try {
            user.permissions = user.permissions ? JSON.parse(user.permissions) : [];
        } catch (e) {
            user.permissions = [];
        }

        res.render('user/edit', {
            title: 'Edit Pengguna - MyMosque',
            user: user,
            allModules: modulesConfig // <-- Menggunakan konfigurasi pusat yang sama secara dinamis!
        });
    });
};

// 5. Proses Update Pengguna
exports.updateUser = (req, res) => {
    const { id } = req.params;
    const { username, password, nama_lengkap, role, permissions } = req.body;
    
    const permsArray = Array.isArray(permissions) ? permissions : (permissions ? [permissions] : []);
    const permsJson = JSON.stringify(permsArray);

    if (password && password.trim() !== "") {
        bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
            if (err) return res.status(500).send("Gagal enkripsi password baru.");

            const sql = `UPDATE users SET username = ?, password = ?, nama_lengkap = ?, role = ?, permissions = ? WHERE id = ?`;
            usersDb.run(sql, [username, hashedPassword, nama_lengkap, role, permsJson, id], (err) => {
                res.redirect('/admin/users');
            });
        });
    } else {
        const sql = `UPDATE users SET username = ?, nama_lengkap = ?, role = ?, permissions = ? WHERE id = ?`;
        usersDb.run(sql, [username, nama_lengkap, role, permsJson, id], (err) => {
            res.redirect('/admin/users');
        });
    }
};

// 6. Proses Hapus Pengguna
exports.hapusUser = (req, res) => {
    const { id } = req.params;
    usersDb.get("SELECT foto FROM users WHERE id = ?", [id], (err, user) => {
        if (user && user.foto) {
            const fotoPath = path.join(__dirname, '../../public/uploads/users/', user.foto);
            if (fs.existsSync(fotoPath)) fs.unlinkSync(fotoPath);
        }
        usersDb.run("DELETE FROM users WHERE id = ?", [id], (err) => {
            res.redirect('/admin/users');
        });
    });
};

// 1. Tampilkan Form Edit Profil Pengguna yang Sedang Login
exports.formEditProfile = (req, res) => {
    const userId = req.session.userId;
    const isSuccess = req.query.success ? true : false;

    usersDb.get("SELECT * FROM users WHERE id = ?", [userId], (err, user) => {
        if (err || !user) {
            return res.status(404).send("Data pengguna tidak ditemukan.");
        }
        res.render('user/profile', {
            title: 'Edit Profil Saya',
            userProfile: user,
            error: null,
            success: isSuccess
        });
    });
};

// 1. Proses Simpan Pembaruan Profil (Wajib Masukkan Password Lama jika ganti password)
exports.updateProfile = async (req, res) => {
    const userId = req.session.userId;
    const { nama_lengkap, username, password_lama, password_baru } = req.body;
    const fotoBaru = req.file ? req.file.filename : null;

    usersDb.get("SELECT * FROM users WHERE id = ?", [userId], async (err, currentUserData) => {
        if (err || !currentUserData) {
            return res.status(404).json({ success: false, error: "Data pengguna tidak ditemukan." });
        }

        let fotoFinal = currentUserData.foto;

        if (fotoBaru) {
            if (currentUserData.foto) {
                const oldPath = path.join(__dirname, '../../public/uploads/users/', currentUserData.foto);
                if (fs.existsSync(oldPath)) {
                    fs.unlink(oldPath, (err) => {
                        if (err) console.error("Gagal menghapus foto profil lama:", err);
                    });
                }
            }
            fotoFinal = fotoBaru;
        }

        try {
            // Jika user mengisi kolom password baru, maka password lama wajib diisi & divalidasi
            if (password_baru && password_baru.trim() !== "") {
                if (!password_lama || password_lama.trim() === "") {
                    return res.json({ success: false, error: 'Password lama wajib diisi untuk melakukan perubahan kata sandi!' });
                }

                // Cek kesesuaian password lama dengan database menggunakan bcrypt
                const isMatch = await bcrypt.compare(password_lama, currentUserData.password);
                if (!isMatch) {
                    return res.json({ success: false, error: 'Password lama yang Anda masukkan salah!' });
                }

                const hashedPassword = await bcrypt.hash(password_baru, saltRounds);

                const sql = `UPDATE users SET nama_lengkap = ?, username = ?, password = ?, foto = ? WHERE id = ?`;
                usersDb.run(sql, [nama_lengkap, username, hashedPassword, fotoFinal, userId], (err) => {
                    if (err) {
                        return res.json({ success: false, error: 'Gagal memperbarui profil (Username mungkin sudah digunakan).' });
                    }
                    return res.json({ success: true, fotoBaru: fotoFinal });
                });
            } else {
                // Jika tidak ingin mengganti password, langsung update data teks & foto
                const sql = `UPDATE users SET nama_lengkap = ?, username = ?, foto = ? WHERE id = ?`;
                usersDb.run(sql, [nama_lengkap, username, fotoFinal, userId], (err) => {
                    if (err) {
                        return res.json({ success: false, error: 'Gagal memperbarui profil (Username mungkin sudah digunakan).' });
                    }
                    return res.json({ success: true, fotoBaru: fotoFinal });
                });
            }
        } catch (error) {
            console.error("Error server:", error);
            return res.status(500).json({ success: false, error: "Terjadi kesalahan pada server." });
        }
    });
};

// 2. Fungsi Reset Password oleh Admin (Dilindungi agar tidak bisa reset diri sendiri)
exports.adminResetPassword = async (req, res) => {
    const adminId = req.session.userId;
    const targetUserId = req.params.id;
    const { password_baru } = req.body;

    // CEGAH ADMIN MERESET AKUNNYA SENDIRI
    if (String(adminId) === String(targetUserId)) {
        return res.status(403).send("Anda tidak diizinkan mereset password akun Anda sendiri melalui menu ini.");
    }

    if (!password_baru || password_baru.trim() === "") {
        return res.status(400).send("Password baru tidak boleh kosong.");
    }

    try {
        const hashedPassword = await bcrypt.hash(password_baru, saltRounds);
        usersDb.run("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, targetUserId], (err) => {
            if (err) {
                console.error("Gagal reset password user:", err.message);
                return res.status(500).send("Gagal mereset password ke database.");
            }
            res.redirect('/admin/users?success_reset=1');
        });
    } catch (e) {
        console.error(e);
        res.status(500).send("Server error saat hashing password.");
    }
};
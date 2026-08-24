const usersDb = require('../../config/users_db');
const ALL_MODULES = require('../../config/modules.config');

// 1. Middleware untuk menyuntikkan data user aktif ke res.locals.currentUser
const attachUser = (req, res, next) => {
    if (!req.session.userId) {
        res.locals.currentUser = null;
        return next();
    }

    usersDb.get("SELECT id, username, nama_lengkap, role, permissions FROM users WHERE id = ?", [req.session.userId], (err, user) => {
        if (user) {
            try {
                user.permissions = JSON.parse(user.permissions || '[]');
            } catch (e) {
                user.permissions = [];
            }
            res.locals.currentUser = user; // <-- Diubah menjadi currentUser agar cocok dengan sidebar.ejs
        } else {
            res.locals.currentUser = null;
        }
        next();
    });
};

// 2. Middleware penjaga halaman berdasarkan izin modul (RBAC)
const checkPermission = (requiredModule) => {
    return (req, res, next) => {
        if (!req.session || !req.session.userId) {
            return res.redirect('/login');
        }

        usersDb.get("SELECT role, permissions FROM users WHERE id = ?", [req.session.userId], (err, user) => {
            if (err || !user) return res.redirect('/login');

            if (user.role === 'Super Admin') {
                return next();
            }

            let perms = [];
            try {
                perms = JSON.parse(user.permissions || '[]');
            } catch (e) {
                perms = [];
            }

            if (perms.includes(requiredModule)) {
                return next();
            } else {
                return res.status(403).send(`
                    <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
                        <h1 style="color: #dc2626;">⛔ Akses Ditolak (403)</h1>
                        <p>Anda tidak memiliki hak akses untuk membuka modul ini.</p>
                        <a href="/admin/dashboard" style="color: #059669; text-decoration: underline;">Kembali ke Dashboard</a>
                    </div>
                `);
            }
        });
    };
};

module.exports = { attachUser, checkPermission };
const usersDb = require('../../config/users_db');
const bcrypt = require('bcrypt');

exports.getLogin = (req, res) => {
    // Jika sudah login, langsung lempar ke dashboard admin
    if (req.session.userId) return res.redirect('/admin/dashboard');
    
    // Tampilkan halaman login, oper pesan error jika ada
    res.render('auth/login', { error: req.query.error });
};

exports.postLogin = (req, res) => {
    const { username, password } = req.body;

    // Cari user berdasarkan username saja terlebih dahulu
    usersDb.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err || !user) {
            return res.redirect('/login?error=Username atau password salah');
        }
        
        // Bandingkan password yang diinput dengan hash yang ada di database menggunakan bcrypt.compare
        bcrypt.compare(password, user.password, (err, isMatch) => {
            if (err || !isMatch) {
                return res.redirect('/login?error=Username atau password salah');
            }

            // Jika password cocok, simpan data ke session
            req.session.userId = user.id;
            req.session.username = user.username;
            res.redirect('/admin/dashboard');
        });
    });
};

exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login');
    });
};
const express = require('express');
const path = require('path');
const session = require('express-session');
require('./config/zakat_db');
const settingsDb = require('./config/settings_db');

const app = express();
const port = 3000; 

// ==========================================
// 2. SETUP SESSION
// ==========================================
app.use(session({
    secret: 'rahasia_mymosque_123',
    resave: false,
    saveUninitialized: false
}));

// Setup Middleware Attach User & Permissions
const { attachUser, checkPermission } = require('./modules/user/auth.middleware');
app.use(attachUser);

// Setup Middleware Umum
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Setup View Engine (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware Global (Settings & Status Login)
app.use((req, res, next) => {
    settingsDb.all("SELECT * FROM app_settings", [], (err, rows) => {
        const appSettings = {};
        if (!err && rows) {
            rows.forEach(row => {
                appSettings[row.key] = row.value;
            });
        }
        res.locals.appSettings = appSettings;
        res.locals.isLoggedIn = req.session && req.session.userId ? true : false;
        next();
    });
});

// ==========================================
// 3. MIDDLEWARE PENJAGA PINTU (AUTH GUARD)
// ==========================================
const requireAuth = (req, res, next) => {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
};

// --- IMPORT ROUTER ---
const authRoutes = require('./modules/auth/auth.routes');
const zakatRoutes = require('./modules/zakat/zakat.routes');
const settingsRoutes = require('./modules/settings/settings.routes');
const userRoutes = require('./modules/user/user.routes');

// ==========================================
// 4. ROUTING AREA PUBLIK
// ==========================================
app.use('/', authRoutes); 

app.get('/', (req, res) => {
    res.send(`
        <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
            <h1>🕌 Website Publik MyMosque</h1>
            <p>Ini adalah halaman depan yang bisa diakses warga.</p>
            <a href="/login" style="display: inline-block; padding: 10px 20px; background: #059669; color: white; text-decoration: none; border-radius: 8px;">Login Pengurus</a>
        </div>
    `);
});

// ==========================================
// 5. ROUTING AREA ADMIN (DILINDUNGI PERMISSION)
// ==========================================
app.get('/admin/dashboard', requireAuth, checkPermission('dashboard'), (req, res) => {
    res.render('dashboard', { title: 'Dashboard Admin - MyMosque' });
});

app.use('/admin/zakat', requireAuth, checkPermission('zakat'), zakatRoutes);
app.use('/admin/settings', requireAuth, checkPermission('settings'), settingsRoutes);
app.use('/admin/users', requireAuth, checkPermission('users'), userRoutes);

// Menjalankan Server di 0.0.0.0
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Aplikasi berjalan dan dapat diakses dari luar pada port ${port}`);
});
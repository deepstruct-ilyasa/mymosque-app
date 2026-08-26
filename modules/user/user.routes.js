const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const userController = require('./user.controller');
const { checkPermission } = require('./auth.middleware');

// Konfigurasi Multer untuk Foto Profil User
const userStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../public/uploads/users');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        cb(null, `logo-${timestamp}-user${ext}`);
    }
});
const uploadUser = multer({ storage: userStorage });

// ==========================================
// RUTE PROFIL MANDIRI (Bisa diakses SEMUA user yang login / Tanpa checkPermission)
// ==========================================
router.get('/profile', userController.formEditProfile);
router.post('/profile', uploadUser.single('foto'), userController.updateProfile);

// ==========================================
// RUTE MANAJEMEN PENGGUNA (DIAMANKAN SATU-SATU DENGAN checkPermission('users'))
// ==========================================
router.get('/', checkPermission('users'), userController.daftarUser);
router.get('/tambah', checkPermission('users'), userController.formTambahUser);
router.post('/tambah', checkPermission('users'), userController.storeUser);
router.get('/edit/:id', checkPermission('users'), userController.formEditUser);
router.post('/edit/:id', checkPermission('users'), userController.updateUser);
router.post('/hapus/:id', checkPermission('users'), userController.hapusUser);
router.post('/reset-password/:id', checkPermission('users'), userController.adminResetPassword);

module.exports = router;
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const userController = require('./user.controller');

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
        // Format seragam: logo-[timestamp]-user.png/jpg
        cb(null, `logo-${timestamp}-user${ext}`);
    }
});
const uploadUser = multer({ storage: userStorage });

router.get('/', userController.daftarUser);
router.get('/tambah', userController.formTambahUser);
router.post('/tambah', userController.storeUser); // Tambah user BARU TANPA UPLOAD FOTO
router.get('/edit/:id', userController.formEditUser);
router.post('/edit/:id', userController.updateUser);
router.post('/hapus/:id', userController.hapusUser);
router.post('/reset-password/:id', userController.adminResetPassword);

router.get('/profile', userController.formEditProfile);
router.post('/profile', uploadUser.single('foto'), userController.updateProfile); // Update profil + ganti foto

module.exports = router;
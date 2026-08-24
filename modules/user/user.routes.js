const express = require('express');
const router = express.Router();
const userController = require('./user.controller'); // Satu folder

router.get('/', userController.daftarUser);
router.get('/tambah', userController.formTambahUser);
router.post('/tambah', userController.storeUser);
router.get('/edit/:id', userController.formEditUser);
router.post('/edit/:id', userController.updateUser);
router.post('/hapus/:id', userController.hapusUser);

module.exports = router;
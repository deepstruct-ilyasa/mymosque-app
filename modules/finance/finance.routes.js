const express = require('express');
const router = express.Router();
const financeController = require('./finance.controller');
const categoryController = require('./category.controller');
const { checkPermission } = require('../user/auth.middleware');

router.use(checkPermission('finance'));

// Transaksi Kas
router.get('/', financeController.daftarTransaksi);
router.get('/tambah', financeController.formTambahTransaksi);
router.post('/tambah', financeController.uploadMiddleware, financeController.storeTransaksi);
router.get('/edit/:id', financeController.formEditTransaksi);
router.post('/edit/:id', financeController.uploadMiddleware, financeController.updateTransaksi);
router.post('/hapus/:id', financeController.hapusTransaksi);

// Closing Monthly
router.post('/tutup-buku', financeController.tutupBuku);
router.get('/check-closing', financeController.apiCheckClosing);

// Kategori Keuangan
router.get('/categories', categoryController.daftarKategori);
router.post('/categories/tambah', categoryController.storeKategori);
router.post('/categories/edit/:id', categoryController.updateKategori);
router.post('/categories/hapus/:id', categoryController.hapusKategori);


module.exports = router;
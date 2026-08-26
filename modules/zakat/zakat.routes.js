const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const zakatController = require('./zakat.controller');

// Konfigurasi Multer untuk modul Zakat agar penamaan filenya konsisten
const zakatStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../public/uploads/zakat');
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        // Format: logo-[timestamp]-zakat.png / .jpg
        cb(null, `logo-${timestamp}-zakat${ext}`);
    }
});
const uploadZakat = multer({ storage: zakatStorage });

// Halaman Rekapitulasi
router.get('/', zakatController.index);

// Halaman Input & Logic Wizard
router.get('/input', zakatController.inputForm);

router.get('/api/rekap', zakatController.apiRekapData);

// Proses POST Data menggunakan uploadZakat
router.post('/wizard-event', uploadZakat.single('logo'), zakatController.storeWizardEvent);
router.post('/transaksi', zakatController.storeTransaksi);
router.post('/event/selesai', zakatController.akhiriEvent);
router.get('/laporan', zakatController.daftarLaporanAgenda);
router.get('/laporan/cetak/:eventId', zakatController.renderLaporanA4);
router.get('/laporan/edit/:eventId', zakatController.formEditEvent);
router.post('/laporan/edit/:eventId', uploadZakat.single('logo'), zakatController.updateEvent);

module.exports = router;
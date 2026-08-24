const multer = require('multer');
const upload = multer({ dest: 'public/uploads/zakat/' });const express = require('express');
const router = express.Router();
const zakatController = require('./zakat.controller');

// Halaman Rekapitulasi
router.get('/', zakatController.index);

// Halaman Input & Logic Wizard
router.get('/input', zakatController.inputForm);

router.get('/api/rekap', zakatController.apiRekapData);

// Proses POST Data
router.post('/wizard-event', upload.single('logo'), zakatController.storeWizardEvent);
router.post('/transaksi', zakatController.storeTransaksi);
router.post('/event/selesai', zakatController.akhiriEvent);
router.get('/laporan', zakatController.daftarLaporanAgenda);
router.get('/laporan/cetak/:eventId', zakatController.renderLaporanA4);
router.get('/laporan/edit/:eventId', zakatController.formEditEvent);
router.post('/laporan/edit/:eventId', upload.single('logo'), zakatController.updateEvent);

module.exports = router;
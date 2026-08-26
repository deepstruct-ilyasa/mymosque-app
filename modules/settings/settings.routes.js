const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const settingsController = require('./settings.controller');

// Konfigurasi Multer untuk menyimpan logo master langsung di /public/uploads/
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../public/uploads');
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        // Format: logo-[timestamp]-settings.png
        cb(null, `logo-${timestamp}-settings${ext}`);
    }
});
const upload = multer({ storage: storage });

router.get('/', settingsController.getSettings);
router.post('/', upload.single('logo'), settingsController.updateSettings);

module.exports = router;
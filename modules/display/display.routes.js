// modules/display/display.routes.js
const express = require('express');
const router = express.Router();
const displayController = require('./display.controller');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../public/uploads/tarkhim');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'tarkhim-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

router.get('/settings', displayController.index);
// Gabungkan upload file ke dalam rute update settings utama
router.post('/settings/update', upload.array('tarkhim_files', 10), displayController.updateSettings);
router.get('/tarkhim/delete/:id', displayController.deleteTarkhim);

module.exports = router;
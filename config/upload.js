const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Mengatur lokasi penyimpanan dan nama file
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Arahkan ke folder public/uploads/zakat/
        const dir = path.join(__dirname, '../public/uploads/zakat');
        
        // Buat folder secara otomatis jika belum ada
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        // Format nama file: logo-[timestamp].[ekstensi]
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });
module.exports = upload;
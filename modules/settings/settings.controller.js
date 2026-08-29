const settingsDb = require('../../config/settings_db');
const fs = require('fs');
const path = require('path');

exports.getSettings = (req, res) => {
    settingsDb.all("SELECT * FROM app_settings", [], (err, rows) => {
        if (err) return res.status(500).send("Gagal memuat pengaturan.");
        
        const settings = {};
        rows.forEach(row => { settings[row.key] = row.value; });

        res.render('settings/index', { title: 'Pengaturan Identitas Masjid', settings });
    });
};

exports.updateSettings = (req, res) => {
    if (!req.body) {
        return res.status(400).send("Data form pengaturan tidak terkirim.");
    }

    const { mosque_name, mosque_address, mosque_phone, timezone, old_logo, city, running_text } = req.body;
    
    // Ambil file logo baru jika ada yang di-upload lewat multer
    const logoBaru = req.file ? req.file.filename : null;
    let logoFinal = old_logo || '';

    if (logoBaru) {
        // Jika ada logo baru, hapus file logo master lama di folder /public/uploads/ jika ada
        if (old_logo) {
            const oldPath = path.join(__dirname, '../../public/uploads/', old_logo);
            if (fs.existsSync(oldPath)) {
                fs.unlink(oldPath, (err) => {
                    if (err) console.error("Gagal menghapus logo master lama:", err);
                });
            }
        }
        logoFinal = logoBaru;
    }

    const updatedData = {
        'mosque_name': mosque_name || '',
        'mosque_address': mosque_address || '',
        'mosque_phone' : mosque_phone || '',
        'timezone': timezone || 'Asia/Jakarta',
        'logo': logoFinal
    };

    const sql = `INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`;
    
    settingsDb.serialize(() => {
        settingsDb.run("BEGIN TRANSACTION");
        
        for (const [key, value] of Object.entries(updatedData)) {
            settingsDb.run(sql, [key, value]);
        }
        
        settingsDb.run("COMMIT", (err) => {
            if (err) {
                console.error("Gagal simpan pengaturan:", err.message);
                return res.render('settings/index', { 
                    title: 'Pengaturan Identitas Masjid', 
                    settings: { mosque_name, mosque_address, timezone },
                    error: "Gagal menyimpan identitas masjid." 
                });
            }
            // Redirect dengan parameter sukses agar modal popup success muncul
            res.redirect('/admin/settings?success=1');
        });
    });
};
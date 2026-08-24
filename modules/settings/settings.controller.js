const settingsDb = require('../../config/settings_db');

exports.getSettings = (req, res) => {
    settingsDb.all("SELECT * FROM app_settings", [], (err, rows) => {
        if (err) return res.status(500).send("Gagal memuat pengaturan.");
        
        const settings = {};
        rows.forEach(row => { settings[row.key] = row.value; });

        res.render('settings/index', { title: 'Pengaturan Identitas Masjid', settings });
    });
};

exports.updateSettings = (req, res) => {
    // Hanya ambil data masjid
    const { mosque_name, mosque_address, timezone } = req.body;
    
    // Susun dalam object
    const updatedData = {
        'mosque_name': mosque_name,
        'mosque_address': mosque_address,
        'timezone': timezone || 'Asia/Jakarta'
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
                return res.status(500).send("Gagal menyimpan identitas masjid.");
            }
            res.redirect('/admin/settings');
        });
    });
};
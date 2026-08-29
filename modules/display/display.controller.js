// modules/display/display.controller.js
const displayDb = require('../../config/display_db');
const settingsDb = require('../../config/settings_db');
const path = require('path');
const fs = require('fs');

exports.index = (req, res) => {
    displayDb.all("SELECT * FROM display_settings", [], (err, settingsRows) => {
        const settings = {};
        if (!err && settingsRows) {
            settingsRows.forEach(r => settings[r.key] = r.value);
        }

        displayDb.all("SELECT * FROM tarkhim_audio ORDER BY id DESC", [], (err, audioRows) => {
            res.render('display/admin_settings', { 
                title: 'Pengaturan Modul Display & Tarkhim', 
                settings: settings,
                tarkhimList: audioRows || [],
                success: req.query.success,
                error: req.query.error
            });
        });
    });
};

// Simpan Seluruh Pengaturan + Upload Audio Tarkhim Sekaligus
exports.updateSettings = (req, res) => {
    const body = req.body;
    
    // DEBUG: Cek apa yang dikirimkan form ke backend
    console.log("DATA BODY DARI ADMIN:", body);

    const keysToSave = [
        'sholat_city', 'sholat_running_text', 'timezone',
        'iqomah_subuh', 'iqomah_dzuhur', 'iqomah_ashar', 'iqomah_maghrib', 'iqomah_isya',
        'prep_tarkhim_menit', 'prep_adzan_subuh', 'prep_adzan_dzuhur', 'prep_adzan_ashar', 'prep_adzan_maghrib', 'prep_adzan_isya',
        'sholat_duration_subuh', 'sholat_duration_dzuhur', 'sholat_duration_ashar', 'sholat_duration_maghrib', 'sholat_duration_isya',
        'durasi_adzan_menit', 'durasi_khutbah_menit'
    ];

    displayDb.serialize(() => {
        displayDb.run("BEGIN TRANSACTION");
        const sql = `INSERT INTO display_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`;
        
        keysToSave.forEach(key => {
            const val = body[key] !== undefined ? body[key] : '';
            displayDb.run(sql, [key, val]);
        });

        displayDb.run("COMMIT", (err) => {
            if (err) {
                console.error("Gagal simpan display settings:", err.message);
                return res.redirect('/admin/display/settings?error=1');
            }
            res.redirect('/admin/display/settings?success=1');
        });
    });
};

exports.deleteTarkhim = (req, res) => {
    const audioId = req.params.id;
    displayDb.get("SELECT filename FROM tarkhim_audio WHERE id = ?", [audioId], (err, row) => {
        if (row && row.filename) {
            const filePath = path.join(__dirname, '../../public/uploads/tarkhim/', row.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            displayDb.run("DELETE FROM tarkhim_audio WHERE id = ?", [audioId], () => {
                res.redirect('/admin/display/settings?success=deleted');
            });
        } else {
            res.redirect('/admin/display/settings?error=not_found');
        }
    });
};

exports.getApiSettings = (req, res) => {
    // 1. Ambil setting khusus display
    displayDb.all("SELECT * FROM display_settings", [], (err, settingRows) => {
        const settings = {};
        if (!err && settingRows) {
            settingRows.forEach(r => settings[r.key] = r.value);
        }

        // 2. AMBIL TIMEZONE DARI TABEL GLOBAL APP_SETTINGS UTAMA
        // (Sesuaikan nama variabel database global settings Anda, misal settingsDb)
        settingsDb.all("SELECT * FROM app_settings", [], (err, globalRows) => {
            const globalSettings = {};
            if (!err && globalRows) {
                globalRows.forEach(r => globalSettings[r.key] = r.value);
            }

            // Ambil nilai timezone global, fallback ke Asia/Jakarta jika kosong
            const activeTimezone = globalSettings.timezone || 'Asia/Jakarta';

            const activeMosqueName = globalSettings.mosque_name || settings.mosque_name || 'undefined';

            displayDb.all("SELECT filename FROM tarkhim_audio", [], (err, audioRows) => {
                const tarkhimPlaylist = audioRows ? audioRows.map(a => `/uploads/tarkhim/${a.filename}`) : [];

                res.json({
                    mosque_name: activeMosqueName,
                    city: settings.sholat_city || 'undefined',
                    timezone: activeTimezone,
                    running_text: settings.sholat_running_text || 'undefined',
                    durasi_adzan: parseInt(settings.durasi_adzan_menit || 3),
                    durasi_khutbah: parseInt(settings.durasi_khutbah_menit || 45),
                    prep_tarkhim_menit: parseInt(settings.prep_tarkhim_menit || 10),
                    tarkhim_playlist: tarkhimPlaylist,
                    iqomah: {
                        Subuh: parseInt(settings.iqomah_subuh || 1),
                        Dzuhur: parseInt(settings.iqomah_dzuhur || 1),
                        Ashar: parseInt(settings.iqomah_ashar || 1),
                        Maghrib: parseInt(settings.iqomah_maghrib || 1),
                        Isya: parseInt(settings.iqomah_isya || 1)
                    },
                    prep_adzan: {
                        Subuh: parseInt(settings.prep_adzan_subuh || 10),
                        Dzuhur: parseInt(settings.prep_adzan_dzuhur || 10),
                        Ashar: parseInt(settings.prep_adzan_ashar || 10),
                        Maghrib: parseInt(settings.prep_adzan_maghrib || 10),
                        Isya: parseInt(settings.prep_adzan_isya || 10)
                    },
                    sholat_duration: {
                        Subuh: parseInt(settings.sholat_duration_subuh || 10),
                        Dzuhur: parseInt(settings.sholat_duration_dzuhur || 10),
                        Ashar: parseInt(settings.sholat_duration_ashar || 10),
                        Maghrib: parseInt(settings.sholat_duration_maghrib || 10),
                        Isya: parseInt(settings.sholat_duration_isya || 10)
                    },
                    server_time: Date.now()
                });
            });
        });
    });
};
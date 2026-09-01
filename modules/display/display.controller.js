// modules/display/display.controller.js
const displayDb = require('../../config/display_db');
const settingsDb = require('../../config/settings_db');
const zakatDb = require('../../config/zakat_db');
const path = require('path');
const fs = require('fs');

exports.index = (req, res) => {
    displayDb.all("SELECT * FROM general_settings", [], (err, globalRows) => {
        const generalSettings = {};
        if (!err && globalRows) {
            globalRows.forEach(r => generalSettings[r.key] = r.value);
        }

        displayDb.all("SELECT * FROM display_settings ORDER BY id_sholat ASC", [], (err, sholatRows) => {
            if (!sholatRows || sholatRows.length === 0) {
                const defaultSholat = [
                    [1, 'Shubuh', 0, 1, 60, 10, 15],
                    [2, 'Dzuhur', 0, 1, 60, 10, 15],
                    [3, "Jum'at", 0, 1, 60, 10, 45],
                    [4, 'Ashar', 0, 1, 60, 10, 15],
                    [5, 'Maghrib', 0, 1, 60, 10, 10],
                    [6, 'Isya', 0, 1, 60, 10, 15]
                ];
                const stmt = displayDb.prepare(`INSERT INTO display_settings (id_sholat, nama_sholat, prep_tarkhim_detik, tarkhim_active, prep_adzan_detik, iqomah_menit, durasi_sholat_menit) VALUES (?, ?, ?, ?, ?, ?, ?)`);
                defaultSholat.forEach(row => stmt.run(row));
                stmt.finalize();

                return displayDb.all("SELECT * FROM display_settings ORDER BY id_sholat ASC", [], (err, newSholatRows) => {
                    renderAdminPage(req, res, generalSettings, newSholatRows);
                });
            }

            renderAdminPage(req, res, generalSettings, sholatRows);
        });
    });
};

function renderAdminPage(req, res, generalSettings, sholatRows) {
    displayDb.all("SELECT * FROM tarkhim_audio ORDER BY id DESC", [], (err, audioRows) => {
        res.render('display/setting_display_sholat', { 
            title: 'Pengaturan Modul Display & Tarkhim', 
            generalSettings: generalSettings,
            sholatList: sholatRows || [],
            tarkhimList: audioRows || [],
            success: req.query.success,
            error: req.query.error
        });
    });
}

exports.updateSettings = (req, res) => {
    const body = req.body;

    displayDb.serialize(() => {
        displayDb.run("BEGIN TRANSACTION");

        const sqlGeneral = `INSERT INTO general_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`;
        displayDb.run(sqlGeneral, ['sholat_city', body.sholat_city || '']);
        displayDb.run(sqlGeneral, ['sholat_running_text', body.sholat_running_text || '']);
        displayDb.run(sqlGeneral, ['durasi_adzan_menit', body.durasi_adzan_menit || '3']);
        displayDb.run(sqlGeneral, ['durasi_khutbah_menit', body.durasi_khutbah_menit || '45']);

        // Loop 1 sampai 6 (Mencakup Dzuhur & Jum'at terpisah)
        const sqlSholat = `UPDATE display_settings SET prep_tarkhim_detik = ?, tarkhim_active = ?, prep_adzan_detik = ?, iqomah_menit = ?, durasi_sholat_menit = ? WHERE id_sholat = ?`;
        
        for (let i = 1; i <= 6; i++) {
            const prepTarkhim = body[`prep_tarkhim_detik_${i}`] || 0;
            const tarkhimActive = body[`tarkhim_active_${i}`] ? 1 : 0;
            const prepAdzan = body[`prep_adzan_detik_${i}`] || 60;
            const iqomah = body[`iqomah_menit_${i}`] || 10;
            const durasiSholat = body[`durasi_sholat_menit_${i}`] || 15;

            displayDb.run(sqlSholat, [prepTarkhim, tarkhimActive, prepAdzan, iqomah, durasiSholat, i]);
        }

        if (req.files) {
            const insertAudioSql = `INSERT INTO tarkhim_audio (id_sholat, original_name, filename) VALUES (?, ?, ?)`;
            for (let i = 1; i <= 6; i++) {
                const fieldName = `tarkhim_files_${i}`;
                if (req.files[fieldName] && req.files[fieldName].length > 0) {
                    req.files[fieldName].forEach(file => {
                        displayDb.run(insertAudioSql, [i, file.originalname, file.filename]);
                    });
                }
            }
        }

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
    displayDb.get("SELECT filename, id_sholat FROM tarkhim_audio WHERE id = ?", [audioId], (err, row) => {
        if (row && row.filename) {
            const filePath = path.join(__dirname, '../../public/uploads/tarkhim/', row.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            displayDb.run("DELETE FROM tarkhim_audio WHERE id = ?", [audioId], () => {
                displayDb.all("SELECT * FROM tarkhim_audio ORDER BY id DESC", [], (err, audioRows) => {
                    res.json({
                        success: true,
                        message: "File audio berhasil dihapus",
                        tarkhimList: audioRows || []
                    });
                });
            });
        } else {
            res.status(404).json({ success: false, message: "File tidak ditemukan" });
        }
    });
};

exports.getApiSettings = (req, res) => {
    displayDb.all("SELECT * FROM general_settings", [], (err, generalRows) => {
        const general = {};
        if (!err && generalRows) {
            generalRows.forEach(r => general[r.key] = r.value);
        }

        displayDb.all("SELECT * FROM display_settings ORDER BY id_sholat ASC", [], (err, sholatRows) => {
            const prepAdzan = {};
            const iqomah = {};
            const sholatDuration = {};
            const prepTarkhimDetik = {};
            const tarkhimActive = {};

            if (sholatRows) {
                sholatRows.forEach(row => {
                    prepAdzan[row.nama_sholat] = parseInt(row.prep_adzan_detik);
                    iqomah[row.nama_sholat] = parseInt(row.iqomah_menit);
                    sholatDuration[row.nama_sholat] = parseInt(row.durasi_sholat_menit);
                    prepTarkhimDetik[row.nama_sholat] = parseInt(row.prep_tarkhim_detik);
                    tarkhimActive[row.nama_sholat] = parseInt(row.tarkhim_active);
                });
            }

            settingsDb.all("SELECT * FROM app_settings", [], (err, globalRows) => {
                const globalSettings = {};
                if (!err && globalRows) {
                    globalRows.forEach(r => globalSettings[r.key] = r.value);
                }

                const activeTimezone = globalSettings.timezone || 'Asia/Jakarta';
                const activeMosqueName = globalSettings.mosque_name || 'undefined';

                displayDb.all("SELECT * FROM tarkhim_audio", [], (err, audioRows) => {
                    const tarkhimPlaylist = audioRows ? audioRows.map(a => ({
                        id_sholat: a.id_sholat,
                        url: `/uploads/tarkhim/${a.filename}`
                    })) : [];

                    res.json({
                        mosque_name: activeMosqueName,
                        city: general.sholat_city || 'undefined',
                        timezone: activeTimezone,
                        running_text: general.sholat_running_text || 'undefined',
                        durasi_adzan: parseInt(general.durasi_adzan_menit || 3),
                        durasi_khutbah: parseInt(general.durasi_khutbah_menit || 45),
                        prep_tarkhim_detik: prepTarkhimDetik,
                        tarkhim_active: tarkhimActive,
                        tarkhim_playlist: tarkhimPlaylist,
                        iqomah: iqomah,
                        prep_adzan: prepAdzan,
                        sholat_duration: sholatDuration,
                        server_time: Date.now()
                    });
                });
            });
        });
    });
};






// Render Halaman Display Zakat (Publik)
exports.renderDisplayZakat = (req, res) => {
    settingsDb.all("SELECT * FROM app_settings", [], (err, rows) => {
        const appSettings = {};
        if (!err && rows) rows.forEach(r => appSettings[r.key] = r.value);
        res.render('display/display_zakat', { title: 'Display Zakat Masjid', appSettings });
    });
};

// API JSON Real-Time untuk Zakat
exports.getApiZakatData = (req, res) => {
    const requestedEventId = req.query.event_id;

    zakatDb.all("SELECT * FROM event ORDER BY id DESC", [], (err, semuaEvent) => {
        if (err || !semuaEvent || semuaEvent.length === 0) {
            return res.json({ error: "Belum ada event" });
        }

        let eventPilihan = null;
        if (requestedEventId) {
            eventPilihan = semuaEvent.find(e => e.id == requestedEventId);
        }
        
        // Jika tidak ada parameter atau event tidak ditemukan, pilih yang Aktif, atau fallback ke event pertama (terbaru)
        if (!eventPilihan) {
            eventPilihan = semuaEvent.find(e => e.status === 'Aktif') || semuaEvent[0];
        }

        zakatDb.all("SELECT * FROM transactions WHERE event_id = ? ORDER BY id DESC", [eventPilihan.id], (err, transaksi) => {
            if (err) transaksi = [];

            const jenisKategori = ['Zakat Fitrah', 'Zakat Mal', 'Infaq / Sedekah', 'Fidyah'];
            let rekapPerJenis = {};
            jenisKategori.forEach(kat => {
                rekapPerJenis[kat] = { jiwa: 0, beras: 0, infaqBeras: 0, uang: 0, infaqUang: 0 };
            });

            transaksi.forEach(t => {
                let jenis = t.jenis_zakat;
                if (!rekapPerJenis[jenis]) {
                    rekapPerJenis[jenis] = { jiwa: 0, beras: 0, infaqBeras: 0, uang: 0, infaqUang: 0 };
                }
                rekapPerJenis[jenis].jiwa += t.jumlah_jiwa;
                rekapPerJenis[jenis].beras = parseFloat((rekapPerJenis[jenis].beras + t.jumlah_beras).toFixed(3));
                rekapPerJenis[jenis].infaqBeras = parseFloat((rekapPerJenis[jenis].infaqBeras + t.infaq_beras).toFixed(3));
                rekapPerJenis[jenis].uang += t.jumlah_uang;
                rekapPerJenis[jenis].infaqUang += t.infaq_uang;
            });

            res.json({
                semuaEvent,
                eventPilihan,
                transaksi,
                rekapPerJenis
            });
        });
    });
};
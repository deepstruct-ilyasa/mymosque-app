const zakatDb = require('../../config/zakat_db');
const settingsDb = require('../../config/settings_db');
const fs = require('fs');
const path = require('path');

exports.index = (req, res) => {
    const selectedEventId = req.query.event_id;

    zakatDb.all("SELECT * FROM event ORDER BY id DESC", [], (err, semuaEvent) => {
        if (err) {
            console.error("Gagal ambil daftar event:", err.message);
            return res.status(500).send("Database error");
        }

        if (semuaEvent.length === 0) {
            return res.render('zakat/index', {
                title: 'Rekapitulasi Zakat',
                semuaEvent: [],
                eventPilihan: null,
                transaksi: [],
                rekapPerJenis: {}
            });
        }

        let eventPilihan = null;
        if (selectedEventId) {
            eventPilihan = semuaEvent.find(e => e.id == selectedEventId);
        }
        
        if (!eventPilihan) {
            eventPilihan = semuaEvent.find(e => e.status === 'Aktif') || semuaEvent[0];
        }

        const sqlTransaksi = "SELECT * FROM transactions WHERE event_id = ? ORDER BY id DESC";
        zakatDb.all(sqlTransaksi, [eventPilihan.id], (err, transaksi) => {
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

            res.render('zakat/index', {
                title: 'Rekapitulasi Zakat',
                semuaEvent,
                eventPilihan,
                transaksi,
                rekapPerJenis
            });
        });
    });
};

exports.apiRekapData = (req, res) => {
    const eventId = req.query.event_id;
    if (!eventId) return res.json({ error: "Event ID tidak ditemukan" });

    zakatDb.all("SELECT * FROM transactions WHERE event_id = ? ORDER BY id DESC", [eventId], (err, transaksi) => {
        if (err) return res.status(500).json({ error: err.message });

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
            transaksi,
            rekapPerJenis
        });
    });
};

exports.inputForm = (req, res) => {
    zakatDb.get("SELECT * FROM event WHERE status = 'Aktif' ORDER BY id DESC LIMIT 1", [], (err, eventAktif) => {
        if (!eventAktif) {
            // Ambil data default dari Pengaturan Aplikasi untuk nilai awal Wizard
            settingsDb.all("SELECT * FROM app_settings", [], (err, rows) => {
                const settings = {};
                if (rows) rows.forEach(r => settings[r.key] = r.value);

                const defaultNama = settings.mosque_name || 'Masjid';
                const defaultAlamat = settings.mosque_address || '';
                const defaultLogo = settings.logo || ''; // Ambil master logo aplikasi

                return res.render('zakat/wizard-event', { 
                    title: 'Setup Periode Zakat',
                    defaultNama,
                    defaultAlamat,
                    defaultLogo
                });
            });
        } else {
            return res.render('zakat/input', { title: 'Input Penerimaan Zakat', event: eventAktif });
        }
    });
};

exports.storeWizardEvent = (req, res) => {
    if (!req.body) {
        return res.status(400).send("Data form tidak terkirim dengan benar.");
    }

    const { 
        nama_event, deskripsi, 
        nama_lembaga, sub_lembaga, telepon, alamat, 
        ketua, nama_ketua, sub_ketua, nama_sub_ketua,
        standar_fitrah_beras, standar_fitrah_uang, 
        standar_fidyah_beras, standar_fidyah_uang, nisab_zakat_mal,
        default_logo // Menerima hidden input master logo dari settings
    } = req.body;
    
    let finalLogo = null;

    if (req.file) {
        // KASUS 1: Admin meng-upload logo baru (sudah otomatis bernama logo-[timestamp]-zakat.ext oleh multer)
        finalLogo = req.file.filename;
    } else if (default_logo) {
        // KASUS 2: Admin TIDAK mengubah logo (memakai default dari Setting Aplikasi)
        // Kita salin file master dari /public/uploads/ ke /public/uploads/zakat/ dengan format nama yang disamakan
        const sourcePath = path.join(__dirname, '../../public/uploads/', default_logo);
        const targetDir = path.join(__dirname, '../../public/uploads/zakat/');
        
        if (fs.existsSync(sourcePath)) {
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }
            const timestamp = Date.now();
            const ext = path.extname(default_logo);
            const copiedFileName = `logo-${timestamp}-zakat${ext}`;
            const targetPath = path.join(targetDir, copiedFileName);
            
            fs.copyFileSync(sourcePath, targetPath);
            finalLogo = copiedFileName; // Tersimpan dengan format logo-[timestamp]-zakat.ext
        }
    }

    const status = 'Aktif';

    zakatDb.run("UPDATE event SET status = 'Selesai'", [], (err) => {
        const sql = `INSERT INTO event 
            (nama_event, deskripsi, nama_lembaga, sub_lembaga, telepon, alamat, logo, ketua, nama_ketua, sub_ketua, nama_sub_ketua, standar_fitrah_beras, standar_fitrah_uang, standar_fidyah_beras, standar_fidyah_uang, nisab_zakat_mal, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            
        zakatDb.run(sql, [
            nama_event || 'Agenda Zakat', 
            deskripsi || '', 
            nama_lembaga || '', 
            sub_lembaga || '', 
            telepon || '', 
            alamat || '', 
            finalLogo,
            ketua || 'Ketua Panitia', 
            nama_ketua || '', 
            sub_ketua || 'Bendahara', 
            nama_sub_ketua || '',
            standar_fitrah_beras || 2.5, 
            standar_fitrah_uang || 40000, 
            standar_fidyah_beras || 0.6, 
            standar_fidyah_uang || 30000, 
            nisab_zakat_mal || 85000000, 
            status
        ], function(err) {
            if (err) {
                console.error("Gagal simpan event:", err.message);
                return res.status(500).send("Gagal menyimpan event ke database.");
            }
            res.redirect('/admin/zakat/input');
        });
    });
};

exports.storeTransaksi = (req, res) => {
    zakatDb.get("SELECT * FROM event WHERE id = ?", [req.body.event_id], (err, event) => {
        if (err || !event) return res.status(400).send("Event tidak valid.");

        const { nama_penyetor, jenis_zakat, jenis_bayar, event_id } = req.body;
        
        let jumlah_jiwa = 0;
        let jiwa_beras = 0;
        let jumlah_beras = 0;
        let infaq_beras = 0;
        let jiwa_uang = 0;
        let jumlah_uang = 0;
        let infaq_uang = 0;

        if (jenis_zakat === 'Zakat Mal') {
            jumlah_jiwa = 0;
            if (jenis_bayar === 'Uang') {
                const totalHarta = parseFloat(req.body.jumlah_uang) || 0;
                jumlah_uang = totalHarta * 0.025; 
                jumlah_beras = 0;
            } else if (jenis_bayar === 'Beras') {
                jumlah_beras = parseFloat(parseFloat(req.body.jumlah_beras).toFixed(3)) || 0;
                jumlah_uang = 0;
            } else if (jenis_bayar === 'Kombinasi') {
                jumlah_beras = parseFloat(parseFloat(req.body.jumlah_beras).toFixed(3)) || 0;
                jumlah_uang = parseFloat(req.body.jumlah_uang) || 0;
            }
        } else {
            let stdBeras = event.standar_fitrah_beras;
            let stdUang = event.standar_fitrah_uang;

            if (jenis_zakat === 'Fidyah') {
                stdBeras = event.standar_fidyah_beras;
                stdUang = event.standar_fidyah_uang;
            }

            if (jenis_bayar === 'Uang') {
                jumlah_jiwa = parseInt(req.body.jumlah_jiwa) || 1;
                jiwa_uang = jumlah_jiwa;
                
                const bayarAktual = parseFloat(req.body.jumlah_uang) || 0;
                const wajibUang = jumlah_jiwa * stdUang;

                if (bayarAktual > wajibUang) {
                    jumlah_uang = wajibUang;
                    infaq_uang = Math.round(bayarAktual - wajibUang);
                } else {
                    jumlah_uang = bayarAktual;
                    infaq_uang = 0;
                }
            } else if (jenis_bayar === 'Beras') {
                jumlah_jiwa = parseInt(req.body.jumlah_jiwa) || 1;
                jiwa_beras = jumlah_jiwa;
                
                const bayarAktualBeras = parseFloat(req.body.jumlah_beras) || 0;
                const wajibBeras = jiwa_beras * stdBeras;

                if (bayarAktualBeras > wajibBeras) {
                    jumlah_beras = wajibBeras;
                    infaq_beras = parseFloat((bayarAktualBeras - wajibBeras).toFixed(3));
                } else {
                    jumlah_beras = bayarAktualBeras;
                    infaq_beras = 0;
                }
            } else if (jenis_bayar === 'Kombinasi') {
                jiwa_beras = parseInt(req.body.jiwa_beras) || 0;
                jiwa_uang = parseInt(req.body.jiwa_uang) || 0;
                jumlah_jiwa = jiwa_beras + jiwa_uang;

                const bayarAktualBeras = parseFloat(req.body.jumlah_beras) || 0;
                const wajibBeras = jiwa_beras * stdBeras;

                const bayarAktualUang = parseFloat(req.body.jumlah_uang) || 0;
                const wajibUang = jiwa_uang * stdUang;

                if (bayarAktualBeras > wajibBeras) {
                    jumlah_beras = wajibBeras;
                    infaq_beras = parseFloat((bayarAktualBeras - wajibBeras).toFixed(3));
                } else {
                    jumlah_beras = bayarAktualBeras;
                    infaq_beras = 0;
                }

                if (bayarAktualUang > wajibUang) {
                    jumlah_uang = wajibUang;
                    infaq_uang = bayarAktualUang - wajibUang;
                } else {
                    jumlah_uang = bayarAktualUang;
                    infaq_uang = 0;
                }
            }
        }

        const sql = `INSERT INTO transactions 
            (event_id, nama_penyetor, jumlah_jiwa, jenis_zakat, jenis_bayar, jiwa_beras, jumlah_beras, infaq_beras, jiwa_uang, jumlah_uang, infaq_uang) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        zakatDb.run(sql, [event_id, nama_penyetor, jumlah_jiwa, jenis_zakat, jenis_bayar, jiwa_beras, jumlah_beras, infaq_beras, jiwa_uang, jumlah_uang, infaq_uang], function(err) {
            if (err) {
                console.error("Gagal simpan transaksi:", err.message);
                return res.status(500).send("Gagal menyimpan transaksi: " + err.message);
            }
            // UPDATE: Redirect ke area admin
            res.redirect('/admin/zakat/input?success=1');
        });
    });
};

exports.akhiriEvent = (req, res) => {
    const { event_id } = req.body;
    zakatDb.run("UPDATE event SET status = 'Selesai' WHERE id = ?", [event_id], (err) => {
        if (err) console.error("Gagal akhiri event:", err.message);
        // UPDATE: Redirect ke area admin
        res.redirect('/admin/zakat/input');
    });
};

exports.daftarLaporanAgenda = (req, res) => {
    zakatDb.all("SELECT * FROM event ORDER BY id DESC", [], (err, semuaEvent) => {
        if (err) {
            console.error("Gagal ambil daftar event:", err.message);
            return res.status(500).send("Database error");
        }

        res.render('zakat/laporan', {
            title: 'Daftar Laporan Agenda Zakat',
            semuaEvent
        });
    });
};

exports.renderLaporanA4 = (req, res) => {
    const { eventId } = req.params;

    zakatDb.get("SELECT * FROM event WHERE id = ?", [eventId], (err, event) => {
        if (err || !event) return res.status(404).send("Event zakat tidak ditemukan.");

        zakatDb.all("SELECT * FROM transactions WHERE event_id = ? ORDER BY id DESC", [eventId], (err, transactions) => {
            const trxs = transactions || [];
            
            const ITEMS_PER_PAGE = 10;
            const pagedTransactions = [];
            for (let i = 0; i < trxs.length; i += ITEMS_PER_PAGE) {
                pagedTransactions.push(trxs.slice(i, i + ITEMS_PER_PAGE));
            }
            if (pagedTransactions.length === 0) pagedTransactions.push([]);

            const laporan = {
                fitrah: trxs.filter(t => t.jenis_zakat === 'Zakat Fitrah'),
                mal: trxs.filter(t => t.jenis_zakat === 'Zakat Mal'),
                infaq: trxs.filter(t => t.jenis_zakat === 'Infaq / Sedekah'),
                fidyah: trxs.filter(t => t.jenis_zakat === 'Fidyah')
            };

            const getSum = (arr) => ({
                beras: arr.reduce((sum, t) => sum + (t.jumlah_beras || 0), 0),
                infaqBeras: arr.reduce((sum, t) => sum + (t.infaq_beras || 0), 0),
                uang: arr.reduce((sum, t) => sum + (t.jumlah_uang || 0), 0),
                infaqUang: arr.reduce((sum, t) => sum + (t.infaq_uang || 0), 0),
                jiwa: arr.reduce((sum, t) => sum + (t.jumlah_jiwa || 0), 0)
            });

            const summary_kategori = {
                'Zakat Fitrah': getSum(laporan.fitrah),
                'Zakat Mal': getSum(laporan.mal),
                'Infaq / Sedekah': getSum(laporan.infaq),
                'Fidyah': getSum(laporan.fidyah)
            };

            res.render('zakat/generate_laporan', {
                judul: `Laporan - ${event.nama_event}`,
                event: event,
                pagedTransactions: pagedTransactions,
                summary_kategori: summary_kategori,
                tanggalCetak: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
            });
        });
    });
};

exports.formEditEvent = (req, res) => {
    const { eventId } = req.params;

    zakatDb.get("SELECT * FROM event WHERE id = ?", [eventId], (err, event) => {
        if (err || !event) {
            return res.status(404).send("Agenda zakat tidak ditemukan.");
        }

        res.render('zakat/edit-agenda', {
            title: `Edit Agenda - ${event.nama_event}`,
            event
        });
    });
};

exports.updateEvent = (req, res) => {
    const { eventId } = req.params;
    const { 
        nama_event, deskripsi, 
        nama_lembaga, sub_lembaga, telepon, alamat, 
        ketua, nama_ketua, sub_ketua, nama_sub_ketua,
        standar_fitrah_beras, standar_fitrah_uang, 
        standar_fidyah_beras, standar_fidyah_uang, nisab_zakat_mal 
    } = req.body;

    zakatDb.get("SELECT logo FROM event WHERE id = ?", [eventId], (err, eventLama) => {
        const logoBaru = req.file ? req.file.filename : null;
        let logoFinal = eventLama ? eventLama.logo : null;

        if (logoBaru) {
            if (eventLama && eventLama.logo) {
                const pathLogoLama = path.join(__dirname, '../../public/uploads/zakat/', eventLama.logo);
                if (fs.existsSync(pathLogoLama)) {
                    fs.unlink(pathLogoLama, (err) => {
                        if (err) console.error("Gagal menghapus file logo lama:", err);
                    });
                }
            }
            logoFinal = logoBaru;
        }

        const sql = `UPDATE event SET 
            nama_event = ?, deskripsi = ?, 
            nama_lembaga = ?, sub_lembaga = ?, telepon = ?, alamat = ?, logo = ?, 
            ketua = ?, nama_ketua = ?, sub_ketua = ?, nama_sub_ketua = ?,
            standar_fitrah_beras = ?, standar_fitrah_uang = ?, 
            standar_fidyah_beras = ?, standar_fidyah_uang = ?, nisab_zakat_mal = ?
            WHERE id = ?`;

        zakatDb.run(sql, [
            nama_event, deskripsi, 
            nama_lembaga, sub_lembaga, telepon, alamat, logoFinal,
            ketua, nama_ketua, sub_ketua, nama_sub_ketua,
            standar_fitrah_beras, standar_fitrah_uang, 
            standar_fidyah_beras, standar_fidyah_uang, nisab_zakat_mal,
            eventId
        ], (err) => {
            if (err) {
                console.error("Gagal update event:", err.message);
                return res.status(500).send("Gagal memperbarui data agenda.");
            }
            // UPDATE: Redirect ke area admin
            res.redirect(`/admin/zakat/laporan/cetak/${eventId}`);
        });
    });
};
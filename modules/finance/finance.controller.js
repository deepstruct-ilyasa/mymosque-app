const financeDb = require('../../config/finance_db');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const appDbPath = path.join(__dirname, '../../database/app_settings.db');

// Konfigurasi Multer untuk Upload Nota & Logo Tutup Buku
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../public/uploads/finance/');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        if (file.fieldname === 'logo') {
            // Ambil bulan dan tahun dari req.body saat form dikirim
            const bulan = req.body.bulan || '1';
            const tahun = req.body.tahun || '2026';
            const kodeUnik = Date.now();
            cb(null, `logo-closing-${bulan}-${tahun}-${kodeUnik}${path.extname(file.originalname)}`);
        } else {
            const tanggal = req.body.tanggal || 'transaksi';
            cb(null, `bukti-trx-${tanggal}-${Date.now()}${path.extname(file.originalname)}`);
        }
    }
});

const upload = multer({ limits: { fileSize: 2 * 1024 * 1024 }, storage: storage });
exports.uploadMiddleware = upload.single('lampiran');
const uploadClosing = upload.single('logo'); // Middleware untuk logo tutup buku

const cekBulanTerkunci = (bulan, tahun, callback) => {
    financeDb.get("SELECT * FROM monthly_closings WHERE bulan = ? AND tahun = ?", [bulan, tahun], (err, row) => {
        callback(row ? true : false);
    });
};

// 1. Tampilkan Daftar Transaksi
exports.daftarTransaksi = (req, res) => {
    const dateNow = new Date();
    const selectedBulan = req.query.bulan ? parseInt(req.query.bulan) : dateNow.getMonth() + 1;
    const selectedTahun = req.query.tahun ? parseInt(req.query.tahun) : dateNow.getFullYear();

    financeDb.get("SELECT * FROM monthly_closings WHERE bulan = ? AND tahun = ?", [selectedBulan, selectedTahun], (err, closingRow) => {
        const isClosed = closingRow ? true : false;

        financeDb.all("SELECT t.*, c.nama_kategori FROM transactions t LEFT JOIN categories c ON t.kategori_id = c.id ORDER BY t.tanggal ASC, t.id ASC", [], (err, rows) => {
            let saldoAwalBulanIni = 0, totalMasukBulanIni = 0, totalKeluarBulanIni = 0, transactionsBulanIni = [];

            rows.forEach(trx => {
                const parts = trx.tanggal.split('-'); 
                const trxDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
                const selectedDate = new Date(selectedTahun, selectedBulan - 1, 1);

                if (trxDate < selectedDate) {
                    if (trx.jenis === 'masuk') saldoAwalBulanIni += trx.jumlah;
                    else if (trx.jenis === 'keluar') saldoAwalBulanIni -= trx.jumlah;
                } else if (parseInt(parts[0]) === selectedTahun && parseInt(parts[1]) === selectedBulan) {
                    if (trx.jenis === 'masuk') totalMasukBulanIni += trx.jumlah;
                    else if (trx.jenis === 'keluar') totalKeluarBulanIni += trx.jumlah;
                    transactionsBulanIni.push(trx);
                }
            });

            transactionsBulanIni.reverse();
            const saldoAkhirBulanIni = saldoAwalBulanIni + totalMasukBulanIni - totalKeluarBulanIni;

            const daftarBulan = [{ angka: 1, nama: 'Januari' }, { angka: 2, nama: 'Februari' }, { angka: 3, nama: 'Maret' }, { angka: 4, nama: 'April' }, { angka: 5, nama: 'Mei' }, { angka: 6, nama: 'Juni' }, { angka: 7, nama: 'Juli' }, { angka: 8, nama: 'Agustus' }, { angka: 9, nama: 'September' }, { angka: 10, nama: 'Oktober' }, { angka: 11, nama: 'November' }, { angka: 12, nama: 'Desember' }];

            // Ambil data dari app_settings.db untuk default identitas global masjid
            const appDb = new sqlite3.Database(appDbPath, sqlite3.OPEN_READONLY);
            appDb.all("SELECT * FROM app_settings", [], (err, appRows) => {
                appDb.close();

                const globalSettings = {};
                if (!err && appRows) {
                    appRows.forEach(r => { globalSettings[r.key] = r.value; });
                }

                // Cek HANYA data closing untuk bulan yang sedang dipilih saat ini (Tanpa melihat closing bulan lalu)
                financeDb.get("SELECT * FROM monthly_closings WHERE bulan = ? AND tahun = ?", [selectedBulan, selectedTahun], (err, currentClosing) => {
                    
                    // Jika bulan ini sudah diclose, pakai datanya. Jika belum, ambil murni dari app_settings global & kosongkan TTD.
                    const activeClosing = currentClosing || {};

                    const formDefaults = {
                        nama_masjid: activeClosing.nama_masjid || globalSettings.mosque_name || 'MASJID AL-MUHARRAR',
                        sub_judul: activeClosing.sub_judul || 'Laporan Pertanggungjawaban Keuangan',
                        alamat: activeClosing.alamat || globalSettings.mosque_address || '',
                        telepon: activeClosing.telepon || globalSettings.mosque_phone || '',
                        logo: activeClosing.logo || globalSettings.logo || '',
                        nama_ketua: activeClosing.nama_ketua || '',
                        jabatan_ketua: activeClosing.jabatan_ketua || 'Ketua Takmir',
                        nama_subketua: activeClosing.nama_subketua || '',
                        jabatan_subketua: activeClosing.jabatan_subketua || 'Bendahara'
                    };

                    res.render('finance/index', {
                        title: 'Manajemen Keuangan - MyMosque',
                        transactions: transactionsBulanIni, saldoAwal: saldoAwalBulanIni, totalMasuk: totalMasukBulanIni,
                        totalKeluar: totalKeluarBulanIni, saldoAkhir: saldoAkhirBulanIni, selectedBulan, selectedTahun, daftarBulan, isClosed,
                        lastClosing: formDefaults
                    });
                });
            });
        });
    });
};

// 2. Form Tambah Transaksi
exports.formTambahTransaksi = (req, res) => {
    financeDb.all("SELECT * FROM categories ORDER BY jenis ASC, nama_kategori ASC", [], (err, categories) => {
        res.render('finance/tambah', { title: 'Catat Transaksi - MyMosque', categories: categories || [], success: req.query.success ? true : false, error: null });
    });
};

// 3. Simpan Transaksi Baru
exports.storeTransaksi = (req, res) => {
    const { tanggal, jenis, kategori_id, jumlah, keterangan } = req.body;
    const lampiran = req.file ? req.file.filename : null;
    const parts = tanggal.split('-');
    
    cekBulanTerkunci(parseInt(parts[1]), parseInt(parts[0]), (terkunci) => {
        if (terkunci) return res.redirect(`/admin/finance?bulan=${parts[1]}&tahun=${parts[0]}&error=Periode sudah ditutup!`);
        financeDb.run(`INSERT INTO transactions (tanggal, jenis, kategori_id, jumlah, lampiran, keterangan) VALUES (?, ?, ?, ?, ?, ?)`, [tanggal, jenis, kategori_id, jumlah, lampiran, keterangan || ''], (err) => {
            res.redirect(`/admin/finance?bulan=${parts[1]}&tahun=${parts[0]}&success=1`);
        });
    });
};

// 4. Form Edit Transaksi
exports.formEditTransaksi = (req, res) => {
    financeDb.get("SELECT * FROM transactions WHERE id = ?", [req.params.id], (err, transaction) => {
        financeDb.all("SELECT * FROM categories ORDER BY jenis ASC, nama_kategori ASC", [], (errCat, categories) => {
            res.render('finance/edit', { title: 'Edit Transaksi', transaction, categories: categories || [], error: null });
        });
    });
};

// 5. Update Transaksi
exports.updateTransaksi = (req, res) => {
    const { tanggal, jenis, kategori_id, jumlah, keterangan } = req.body;
    const parts = tanggal.split('-');

    cekBulanTerkunci(parseInt(parts[1]), parseInt(parts[0]), (terkunci) => {
        if (terkunci) return res.redirect(`/admin/finance?error=Periode terkunci!`);
        financeDb.get("SELECT lampiran FROM transactions WHERE id = ?", [req.params.id], (err, trx) => {
            let lampiranFinal = trx ? trx.lampiran : null;
            if (req.file) {
                if (trx && trx.lampiran) {
                    const pathLama = path.join(__dirname, '../../public/uploads/finance/', trx.lampiran);
                    if (fs.existsSync(pathLama)) fs.unlinkSync(pathLama);
                }
                lampiranFinal = req.file.filename;
            }
            financeDb.run(`UPDATE transactions SET tanggal = ?, jenis = ?, kategori_id = ?, jumlah = ?, lampiran = ?, keterangan = ? WHERE id = ?`, [tanggal, jenis, kategori_id, jumlah, lampiranFinal, keterangan || '', req.params.id], () => {
                res.redirect(`/admin/finance/edit/${req.params.id}?success=1`);
            });
        });
    });
};

// 6. Hapus Transaksi
exports.hapusTransaksi = (req, res) => {
    financeDb.get("SELECT * FROM transactions WHERE id = ?", [req.params.id], (err, trx) => {
        const parts = trx.tanggal.split('-');
        cekBulanTerkunci(parseInt(parts[1]), parseInt(parts[0]), (terkunci) => {
            if (terkunci) return res.redirect(`/admin/finance?error=Periode terkunci!`);
            if (trx.lampiran) {
                const pathFile = path.join(__dirname, '../../public/uploads/finance/', trx.lampiran);
                if (fs.existsSync(pathFile)) fs.unlinkSync(pathFile);
            }
            financeDb.run("DELETE FROM transactions WHERE id = ?", [req.params.id], () => {
                res.redirect(`/admin/finance?bulan=${parts[1]}&tahun=${parts[0]}`);
            });
        });
    });
};

// 7. Proses Tutup Buku (Menyimpan Arsip Snapshot ke monthly_closings dengan Auto-Copy Logo)
exports.tutupBuku = (req, res) => {
    uploadClosing(req, res, function(err) {
        const { bulan, tahun, nama_masjid, sub_judul, alamat, telepon, nama_ketua, jabatan_ketua, nama_subketua, jabatan_subketua, logo_lama } = req.body;
        const b = parseInt(bulan), t = parseInt(tahun);

        let logoFinal = logo_lama;

        // Jika pengurus MENGUNGGAH LOGO BARU
        if (req.file) {
            logoFinal = req.file.filename;
        } 
        // Jika pengurus TIDAK UPLOAD LOGO BARU, TAPI ada logo lama yang dijadikan acuan
        else if (logo_lama) {
            let sourcePath = path.join(__dirname, '../../public/uploads/finance/', logo_lama);
            if (!fs.existsSync(sourcePath)) {
                sourcePath = path.join(__dirname, '../../public/uploads/', logo_lama);
            }

            if (fs.existsSync(sourcePath)) {
                const ext = path.extname(logo_lama);
                // FORMAT DIPERBAIKI MENJADI: logo-closing-bulan-tahun-kodeunik (b-t)
                const newLogoName = `logo-closing-${b}-${t}-${Date.now()}${ext}`;
                const destPath = path.join(__dirname, '../../public/uploads/finance/', newLogoName);

                try {
                    fs.copyFileSync(sourcePath, destPath);
                    logoFinal = newLogoName; 
                } catch (copyErr) {
                    console.error("Gagal menyalin logo lama:", copyErr);
                }
            }
        }

        financeDb.all("SELECT * FROM transactions ORDER BY tanggal ASC", [], (err, rows) => {
            let saldoAwal = 0, masuk = 0, keluar = 0;
            rows.forEach(trx => {
                const parts = trx.tanggal.split('-');
                const dTrx = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
                const dTarget = new Date(t, b - 1, 1);
                if (dTrx < dTarget) {
                    if (trx.jenis === 'masuk') saldoAwal += trx.jumlah; else saldoAwal -= trx.jumlah;
                } else if (parseInt(parts[0]) === t && parseInt(parts[1]) === b) {
                    if (trx.jenis === 'masuk') masuk += trx.jumlah; else keluar += trx.jumlah;
                }
            });

            const saldoAkhirPeriode = saldoAwal + masuk - keluar;
            const query = `INSERT OR REPLACE INTO monthly_closings (bulan, tahun, saldo_akhir, nama_masjid, sub_judul, alamat, telepon, logo, nama_ketua, jabatan_ketua, nama_subketua, jabatan_subketua) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            
            financeDb.run(query, [b, t, saldoAkhirPeriode, nama_masjid, sub_judul, alamat, telepon, logoFinal, nama_ketua, jabatan_ketua, nama_subketua, jabatan_subketua], () => {
                res.redirect(`/admin/finance?bulan=${b}&tahun=${t}&success=closing`);
            });
        });
    });
};

// 8. Tampilkan Daftar Arsip Laporan Keuangan (Gaya Kartu seperti Zakat)
exports.formLaporan = (req, res) => {
    financeDb.all("SELECT * FROM monthly_closings ORDER BY tahun DESC, bulan DESC", [], (err, closings) => {
        if (err) closings = [];

        const namaBulanArr = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

        const formattedClosings = closings.map(c => ({
            ...c,
            nama_bulan_teks: namaBulanArr[c.bulan] || 'Bulan'
        }));

        res.render('finance/laporan', {
            title: 'Pusat Arsip & Laporan Keuangan - MyMosque',
            closings: formattedClosings
        });
    });
};

// 9. Cetak Laporan (Hanya ambil data spesifik bulan yang dicetak, TANPA fallback ke bulan lain)
exports.cetakLaporan = (req, res) => {
    const b = parseInt(req.query.bulan), t = parseInt(req.query.tahun);

    // MURNI AMBIL DATA CLOSING BULAN ITU SAJA
    financeDb.get("SELECT * FROM monthly_closings WHERE bulan = ? AND tahun = ?", [b, t], (err, closingThisMonth) => {
        const closingData = closingThisMonth || {};

        financeDb.all("SELECT t.*, c.nama_kategori FROM transactions t LEFT JOIN categories c ON t.kategori_id = c.id ORDER BY t.tanggal ASC, t.id ASC", [], (err, rows) => {
            let saldoAwal = 0, totalMasuk = 0, totalKeluar = 0, trxBulanIni = [];
            rows.forEach(trx => {
                const parts = trx.tanggal.split('-');
                const dTrx = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
                const dTarget = new Date(t, b - 1, 1);
                if (dTrx < dTarget) {
                    if (trx.jenis === 'masuk') saldoAwal += trx.jumlah; else saldoAwal -= trx.jumlah;
                } else if (parseInt(parts[0]) === t && parseInt(parts[1]) === b) {
                    if (trx.jenis === 'masuk') totalMasuk += trx.jumlah; else totalKeluar += trx.jumlah;
                    trxBulanIni.push(trx);
                }
            });

            const daftarBulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            res.render('finance/cetak_laporan', {
                title: `Laporan - ${daftarBulan[b - 1]} ${t}`,
                transactions: trxBulanIni, saldoAwal, totalMasuk, totalKeluar, saldoAkhir: saldoAwal + totalMasuk - totalKeluar,
                periodeBulan: daftarBulan[b - 1], periodeTahun: t,
                settings: closingData,
                tanggalCetak: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
            });
        });
    });
};

exports.apiCheckClosing = (req, res) => {
    cekBulanTerkunci(parseInt(req.query.bulan), parseInt(req.query.tahun), (terkunci) => res.json({ isClosed: terkunci }));
};


// 10. Form Edit Arsip Tutup Buku
exports.formEditLaporan = (req, res) => {
    const closingId = req.params.id;
    financeDb.get("SELECT * FROM monthly_closings WHERE id = ?", [closingId], (err, closing) => {
        if (err || !closing) {
            return res.redirect('/admin/finance/laporan?error=Arsip tidak ditemukan');
        }

        const namaBulanArr = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        closing.nama_bulan_teks = namaBulanArr[closing.bulan] || '';

        res.render('finance/edit_laporan', {
            title: `Edit Arsip Laporan - ${closing.nama_bulan_teks} ${closing.tahun}`,
            closing: closing
        });
    });
};

// 11. Proses Update Arsip Tutup Buku
exports.updateLaporan = (req, res) => {
    uploadClosing(req, res, function(err) {
        if (err instanceof multer.MulterError) {
            console.error("Multer Error:", err.message);
            return res.redirect('/admin/finance/laporan?error=' + encodeURIComponent(err.message));
        } else if (err) {
            console.error("Unknown Error:", err.message);
            return res.redirect('/admin/finance/laporan?error=Upload gagal');
        }

        const closingId = req.params.id;
        const { nama_masjid, sub_judul, alamat, telepon, nama_ketua, jabatan_ketua, nama_subketua, jabatan_subketua, logo_lama } = req.body;
        
        let logoFinal = logo_lama;
        if (req.file) {
            logoFinal = req.file.filename;
        }

        const query = `UPDATE monthly_closings SET nama_masjid = ?, sub_judul = ?, alamat = ?, telepon = ?, logo = ?, nama_ketua = ?, jabatan_ketua = ?, nama_subketua = ?, jabatan_subketua = ? WHERE id = ?`;

        financeDb.run(query, [
            nama_masjid || '', 
            sub_judul || '', 
            alamat || '', 
            telepon || '', 
            logoFinal || '', 
            nama_ketua || '', 
            jabatan_ketua || '', 
            nama_subketua || '', 
            jabatan_subketua || '', 
            closingId
        ], (dbErr) => {
            if (dbErr) {
                console.error("Gagal update arsip:", dbErr.message);
            }
            res.redirect('/admin/finance/laporan?success=updated');
        });
    });
};
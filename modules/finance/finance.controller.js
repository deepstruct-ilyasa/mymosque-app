const financeDb = require('../../config/finance_db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Konfigurasi Multer untuk Penamaan File Sesuai Keperluan Transaksi
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../public/uploads/finance/');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const tanggal = req.body.tanggal || 'transaksi';
        const kategoriId = req.body.kategori_id || 'umum';
        
        // Ambil nama kategori dari database untuk menyusun penamaan file yang deskriptif
        financeDb.get("SELECT nama_kategori FROM categories WHERE id = ?", [kategoriId], (err, cat) => {
            let namaKategoriSlug = 'umum';
            if (cat && cat.nama_kategori) {
                namaKategoriSlug = cat.nama_kategori.toLowerCase().replace(/[^a-z0-9]/g, '-');
            }
            const uniqueSuffix = Date.now();
            const ext = path.extname(file.originalname);
            // Format nama file: bukti-[kategori]-[tanggal]-[timestamp].ext
            cb(null, `bukti-${namaKategoriSlug}-${tanggal}-${uniqueSuffix}${ext}`);
        });
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // Maksimal 2MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Hanya file gambar yang diizinkan!'));
        }
    }
}).single('lampiran');

// Middleware untuk upload aman
exports.uploadMiddleware = (req, res, next) => {
    upload(req, res, function (err) {
        if (err instanceof multer.MulterError) {
            return res.redirect('/admin/finance/tambah?error=Ukuran file terlalu besar (Maks 2MB).');
        } else if (err) {
            return res.redirect('/admin/finance/tambah?error=' + err.message);
        }
        next();
    });
};

// Fungsi pembantu untuk mengecek apakah suatu bulan sudah ditutup buku (dikunci)
const cekBulanTerkunci = (bulan, tahun, callback) => {
    financeDb.get("SELECT * FROM monthly_closings WHERE bulan = ? AND tahun = ?", [bulan, tahun], (err, row) => {
        callback(row ? true : false);
    });
};

// 1. Tampilkan Daftar Transaksi & Ringkasan Saldo Berdasarkan Bulan & Status Tutup Buku
exports.daftarTransaksi = (req, res) => {
    const dateNow = new Date();
    const selectedBulan = req.query.bulan ? parseInt(req.query.bulan) : dateNow.getMonth() + 1;
    const selectedTahun = req.query.tahun ? parseInt(req.query.tahun) : dateNow.getFullYear();

    // Cek apakah periode bulan ini sudah dikunci (tutup buku)
    financeDb.get("SELECT * FROM monthly_closings WHERE bulan = ? AND tahun = ?", [selectedBulan, selectedTahun], (err, closingRow) => {
        const isClosed = closingRow ? true : false;

        const queryAll = `
            SELECT t.*, c.nama_kategori, c.jenis as jenis_kategori 
            FROM transactions t 
            LEFT JOIN categories c ON t.kategori_id = c.id 
            ORDER BY t.tanggal ASC, t.id ASC
        `;

        financeDb.all(queryAll, [], (err, rows) => {
            if (err) {
                console.error(err);
                return res.status(500).send("Terjadi kesalahan pada database.");
            }

            let saldoAwalBulanIni = 0;
            let totalMasukBulanIni = 0;
            let totalKeluarBulanIni = 0;
            let transactionsBulanIni = [];

            rows.forEach(trx => {
                const parts = trx.tanggal.split('-'); // Format YYYY-MM-DD
                const trxTahun = parseInt(parts[0]);
                const trxBulan = parseInt(parts[1]);

                const trxDate = new Date(trxTahun, trxBulan - 1, 1);
                const selectedDate = new Date(selectedTahun, selectedBulan - 1, 1);

                // Jika transaksi terjadi SEBELUM bulan yang dipilih, hitung sebagai akumulasi saldo awal
                if (trxDate < selectedDate) {
                    if (trx.jenis === 'masuk') {
                        saldoAwalBulanIni += trx.jumlah;
                    } else if (trx.jenis === 'keluar') {
                        saldoAwalBulanIni -= trx.jumlah;
                    }
                } 
                // Jika transaksi terjadi TEPAT di bulan yang dipilih
                else if (trxTahun === selectedTahun && trxBulan === selectedBulan) {
                    if (trx.jenis === 'masuk') {
                        totalMasukBulanIni += trx.jumlah;
                    } else if (trx.jenis === 'keluar') {
                        totalKeluarBulanIni += trx.jumlah;
                    }
                    transactionsBulanIni.push(trx);
                }
            });

            // Balik urutan transaksi bulan ini agar yang terbaru berada di atas pada tabel
            transactionsBulanIni.reverse();

            const saldoAkhirBulanIni = saldoAwalBulanIni + totalMasukBulanIni - totalKeluarBulanIni;

            // Daftar nama bulan untuk dropdown filter
            const daftarBulan = [
                { angka: 1, nama: 'Januari' },
                { angka: 2, nama: 'Februari' },
                { angka: 3, nama: 'Maret' },
                { angka: 4, nama: 'April' },
                { angka: 5, nama: 'Mei' },
                { angka: 6, nama: 'Juni' },
                { angka: 7, nama: 'Juli' },
                { angka: 8, nama: 'Agustus' },
                { angka: 9, nama: 'September' },
                { angka: 10, nama: 'Oktober' },
                { angka: 11, nama: 'November' },
                { angka: 12, nama: 'Desember' }
            ];

            res.render('finance/index', {
                title: 'Manajemen Keuangan - MyMosque',
                transactions: transactionsBulanIni,
                saldoAwal: saldoAwalBulanIni,
                totalMasuk: totalMasukBulanIni,
                totalKeluar: totalKeluarBulanIni,
                saldoAkhir: saldoAkhirBulanIni,
                selectedBulan,
                selectedTahun,
                daftarBulan,
                isClosed
            });
        });
    });
};

// 2. Form Tambah Transaksi
exports.formTambahTransaksi = (req, res) => {
    financeDb.all("SELECT * FROM categories ORDER BY jenis ASC, nama_kategori ASC", [], (err, categories) => {
        res.render('finance/tambah', {
            title: 'Catat Transaksi Baru - MyMosque',
            categories: categories || [],
            success: req.query.success ? true : false,
            error: null
        });
    });
};

// 3. Simpan Transaksi Baru (Dengan Validasi Cek Kunci Periode)
exports.storeTransaksi = (req, res) => {
    const { tanggal, jenis, kategori_id, jumlah, keterangan } = req.body;
    const lampiran = req.file ? req.file.filename : null;

    if (!tanggal || !jenis || !kategori_id || !jumlah) {
        return financeDb.all("SELECT * FROM categories ORDER BY jenis ASC, nama_kategori ASC", [], (err, categories) => {
            res.render('finance/tambah', {
                title: 'Catat Transaksi Baru - MyMosque',
                categories,
                error: 'Semua kolom yang wajib harus diisi!',
                success: false
            });
        });
    }

    const parts = tanggal.split('-');
    const tahunTrx = parseInt(parts[0]);
    const bulanTrx = parseInt(parts[1]);

    cekBulanTerkunci(bulanTrx, tahunTrx, (terkunci) => {
        if (terkunci) {
            return res.redirect(`/admin/finance?bulan=${bulanTrx}&tahun=${tahunTrx}&error=Periode bulan ini sudah ditutup buku dan dikunci!`);
        }

        const query = `INSERT INTO transactions (tanggal, jenis, kategori_id, jumlah, lampiran, keterangan) VALUES (?, ?, ?, ?, ?, ?)`;
        financeDb.run(query, [tanggal, jenis, kategori_id, jumlah, lampiran, keterangan || ''], (err) => {
            if (err) {
                console.error(err);
                return res.redirect('/admin/finance/tambah?error=Gagal menyimpan transaksi.');
            }
            res.redirect(`/admin/finance?bulan=${bulanTrx}&tahun=${tahunTrx}&success=1`);
        });
    });
};

// 4. Form Edit Transaksi
exports.formEditTransaksi = (req, res) => {
    const { id } = req.params;
    financeDb.get("SELECT * FROM transactions WHERE id = ?", [id], (err, transaction) => {
        if (err || !transaction) return res.redirect('/admin/finance');

        financeDb.all("SELECT * FROM categories ORDER BY jenis ASC, nama_kategori ASC", [], (errCat, categories) => {
            res.render('finance/edit', {
                title: 'Edit Transaksi - MyMosque',
                transaction,
                categories: categories || [],
                error: null
            });
        });
    });
};

// 5. Update Transaksi (Dengan Validasi Cek Kunci Periode)
exports.updateTransaksi = (req, res) => {
    const { id } = req.params;
    const { tanggal, jenis, kategori_id, jumlah, keterangan } = req.body;
    const lampiranBaru = req.file ? req.file.filename : null;

    const parts = tanggal.split('-');
    const tahunTrx = parseInt(parts[0]);
    const bulanTrx = parseInt(parts[1]);

    cekBulanTerkunci(bulanTrx, tahunTrx, (terkunci) => {
        if (terkunci) {
            return res.redirect(`/admin/finance?bulan=${bulanTrx}&tahun=${tahunTrx}&error=Tidak dapat mengubah data pada periode yang sudah ditutup buku!`);
        }

        financeDb.get("SELECT lampiran FROM transactions WHERE id = ?", [id], (err, trxLama) => {
            let lampiranFinal = trxLama ? trxLama.lampiran : null;

            if (lampiranBaru) {
                if (trxLama && trxLama.lampiran) {
                    const pathLama = path.join(__dirname, '../../public/uploads/finance/', trxLama.lampiran);
                    if (fs.existsSync(pathLama)) fs.unlinkSync(pathLama);
                }
                lampiranFinal = lampiranBaru;
            }

            const query = `UPDATE transactions SET tanggal = ?, jenis = ?, kategori_id = ?, jumlah = ?, lampiran = ?, keterangan = ? WHERE id = ?`;
            financeDb.run(query, [tanggal, jenis, kategori_id, jumlah, lampiranFinal, keterangan || '', id], (err) => {
                if (err) {
                    console.error(err);
                    return res.redirect(`/admin/finance/edit/${id}?error=Gagal memperbarui transaksi.`);
                }
                res.redirect(`/admin/finance/edit/${id}?success=1`);
            });
        });
    });
};

// 6. Hapus Transaksi & File Fotonya (Dengan Validasi Cek Kunci Periode)
exports.hapusTransaksi = (req, res) => {
    const { id } = req.params;
    financeDb.get("SELECT * FROM transactions WHERE id = ?", [id], (err, trx) => {
        if (!trx) return res.redirect('/admin/finance');

        const parts = trx.tanggal.split('-');
        const tahunTrx = parseInt(parts[0]);
        const bulanTrx = parseInt(parts[1]);

        cekBulanTerkunci(bulanTrx, tahunTrx, (terkunci) => {
            if (terkunci) {
                return res.redirect(`/admin/finance?bulan=${bulanTrx}&tahun=${tahunTrx}&error=Tidak dapat menghapus data pada periode yang sudah ditutup buku!`);
            }

            if (trx.lampiran) {
                const pathFile = path.join(__dirname, '../../public/uploads/finance/', trx.lampiran);
                if (fs.existsSync(pathFile)) fs.unlinkSync(pathFile);
            }
            financeDb.run("DELETE FROM transactions WHERE id = ?", [id], (err) => {
                res.redirect(`/admin/finance?bulan=${bulanTrx}&tahun=${tahunTrx}`);
            });
        });
    });
};

// 7. Proses Tutup Buku Bulan Berjalan
exports.tutupBuku = (req, res) => {
    const { bulan, tahun } = req.body;
    const b = parseInt(bulan);
    const t = parseInt(tahun);

    const queryAll = "SELECT * FROM transactions ORDER BY tanggal ASC, id ASC";
    financeDb.all(queryAll, [], (err, rows) => {
        if (err) return res.redirect('/admin/finance?error=Terjadi kesalahan sistem.');

        let saldoAwal = 0;
        let masuk = 0;
        let keluar = 0;

        rows.forEach(trx => {
            const parts = trx.tanggal.split('-');
            const tTrx = parseInt(parts[0]);
            const bTrx = parseInt(parts[1]);
            const dTrx = new Date(tTrx, bTrx - 1, 1);
            const dTarget = new Date(t, b - 1, 1);

            if (dTrx < dTarget) {
                if (trx.jenis === 'masuk') saldoAwal += trx.jumlah;
                else if (trx.jenis === 'keluar') saldoAwal -= trx.jumlah;
            } else if (tTrx === t && bTrx === b) {
                if (trx.jenis === 'masuk') masuk += trx.jumlah;
                else if (trx.jenis === 'keluar') keluar += trx.jumlah;
            }
        });

        const saldoAkhirPeriode = saldoAwal + masuk - keluar;

        const insertClosing = "INSERT OR REPLACE INTO monthly_closings (bulan, tahun, saldo_akhir) VALUES (?, ?, ?)";
        financeDb.run(insertClosing, [b, t, saldoAkhirPeriode], (err) => {
            if (err) return res.redirect(`/admin/finance?bulan=${b}&tahun=${t}&error=Gagal melakukan tutup buku.`);
            res.redirect(`/admin/finance?bulan=${b}&tahun=${t}&success=closing`);
        });
    });
};

exports.apiCheckClosing = (req, res) => {
    const { bulan, tahun } = req.query;
    if (!bulan || !tahun) return res.json({ isClosed: false });

    cekBulanTerkunci(parseInt(bulan), parseInt(tahun), (terkunci) => {
        res.json({ isClosed: terkunci });
    });
};
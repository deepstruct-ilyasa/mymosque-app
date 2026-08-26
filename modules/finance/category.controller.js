const financeDb = require('../../config/finance_db');

// 1. Tampilkan Daftar Kategori & Tangani Mode Edit (jika ada ?edit=id)
exports.daftarKategori = (req, res) => {
    const editId = req.query.edit;

    financeDb.all("SELECT * FROM categories ORDER BY jenis ASC, nama_kategori ASC", [], (err, categories) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Terjadi kesalahan pada database.");
        }

        let categoryToEdit = null;
        if (editId) {
            categoryToEdit = categories.find(c => String(c.id) === String(editId));
        }

        res.render('finance/category_index', {
            title: 'Kelola Kategori Keuangan - MyMosque',
            categories,
            categoryToEdit // Dikirim ke view untuk mengisi form jika mode edit aktif
        });
    });
};

// 2. Simpan Kategori Baru
exports.storeKategori = (req, res) => {
    const { nama_kategori, jenis } = req.body;

    if (!nama_kategori || !jenis) {
        return res.redirect('/admin/finance/categories?error=Nama kategori dan jenis wajib diisi!');
    }

    const query = `INSERT INTO categories (nama_kategori, jenis) VALUES (?, ?)`;
    financeDb.run(query, [nama_kategori, jenis], (err) => {
        if (err) {
            console.error(err);
            return res.redirect('/admin/finance/categories?error=Gagal menyimpan kategori.');
        }
        res.redirect('/admin/finance/categories?success=1');
    });
};

// 3. Proses Update Kategori
exports.updateKategori = (req, res) => {
    const { id } = req.params;
    const { nama_kategori, jenis } = req.body;

    if (!nama_kategori || !jenis) {
        return res.redirect(`/admin/finance/categories?edit=${id}&error=Nama kategori dan jenis wajib diisi!`);
    }

    const query = `UPDATE categories SET nama_kategori = ?, jenis = ? WHERE id = ?`;
    financeDb.run(query, [nama_kategori, jenis, id], (err) => {
        if (err) {
            console.error(err);
            return res.redirect(`/admin/finance/categories?edit=${id}&error=Gagal memperbarui kategori.`);
        }
        res.redirect('/admin/finance/categories?success=1');
    });
};

// 4. Hapus Kategori
exports.hapusKategori = (req, res) => {
    const { id } = req.params;
    financeDb.run("DELETE FROM categories WHERE id = ?", [id], (err) => {
        if (err) {
            console.error(err);
        }
        res.redirect('/admin/finance/categories');
    });
};
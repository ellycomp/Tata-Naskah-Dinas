# Backend Google Apps Script — Tata Naskah Dinas SIT Qudwah

Folder ini adalah fondasi backend Google Apps Script untuk menggantikan hosting eksternal.
Penyimpanan pusat: Google Drive + Google Spreadsheet.

## Isi
- `Code.gs`: setup Drive/Spreadsheet, daftar pengguna, draf, profil kop, arsip PDF/JSON, penomoran terkunci, dan audit log.
- `Index.html`: halaman pemeriksaan status sementara.
- `appsscript.json`: konfigurasi Apps Script zona waktu Asia/Jakarta.

## Instalasi awal
1. Buka https://script.google.com/ menggunakan akun Google pemilik penyimpanan SIT Qudwah.
2. Buat proyek baru bernama **Tata Naskah Dinas - SIT Qudwah**.
3. Salin isi `Code.gs` ke file Code.gs.
4. Tambahkan file HTML bernama `Index`, lalu salin isi `Index.html`.
5. Di Project Settings aktifkan tampilan manifest `appsscript.json`, lalu sesuaikan dengan file manifest di folder ini.
6. Jalankan fungsi `setupWorkspace` satu kali dan berikan izin Google Drive serta Spreadsheet.
7. Periksa folder **TATA NASKAH DINAS - SIT QUDWAH** dan spreadsheet database yang dibuat.
8. Tambahkan email pengguna sekolah ke tab **Users**. Kolom `aktif` harus TRUE; role awal yang disediakan adalah admin.

## Catatan akses penting
Manifest saat ini disetel untuk dijalankan sebagai pemilik deployment. Apps Script tidak selalu dapat membaca email pengunjung pada akun Gmail konsumen ketika Web App dijalankan sebagai pemilik. Karena itu, sebelum dipakai banyak pengguna, uji identitas akun pada deployment. Jangan mengubah akses menjadi publik tanpa pembatasan pengguna. Jika email pengunjung kosong, kita perlu memilih pola autentikasi yang sesuai dengan jenis akun Google sekolah.

## Tahap integrasi berikutnya
Antarmuka React yang sudah ada (13 jenis surat, editor/pratinjau, kop, nomor surat, arsip, tanda tangan, QR, ekspor PDF) perlu dihubungkan ke fungsi server melalui `google.script.run`. File backend ini belum menggantikan UI React; halaman Index saat ini hanya halaman pemeriksaan backend.

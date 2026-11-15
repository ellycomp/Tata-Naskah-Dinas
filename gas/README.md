# Tata Naskah Dinas SIT Qudwah — Google Apps Script

Folder ini berisi backend Google Apps Script dan halaman web yang akan menjadi aplikasi tanpa hosting eksternal.

## Arsitektur
- Google Apps Script: menjalankan Web App.
- Google Spreadsheet: database pengguna, konfigurasi, profil kop, draf, arsip, nomor surat, dan audit.
- Google Drive: folder sekolah, file JSON surat, dan PDF.
- React + Vite: antarmuka asli aplikasi (13 jenis surat, editor/pratinjau, kop, penomoran, arsip, tanda tangan, QR, PDF).

## File
- `Code.gs`: layanan server Google Drive dan Spreadsheet.
- `Index.html`: dihasilkan otomatis dari build React, bukan halaman placeholder.
- `appsscript.json`: konfigurasi Apps Script.
- `../src/utils/googleAppsScript.ts`: jembatan frontend ke Apps Script.
- `../scripts/build-google-apps-script.mjs`: menggabungkan hasil build React/CSS ke satu HTML untuk HtmlService.

## Build antarmuka
Di lingkungan yang memiliki Node.js:
1. Jalankan `npm install`.
2. Jalankan `npm run build`.
3. Proses build membuat `gas/Index.html` berisi bundle React dan CSS yang sudah disatukan.

Build belum boleh dianggap teruji sampai `npm run build` selesai tanpa error dan hasilnya diuji pada Web App Apps Script.

## Membuat proyek Apps Script
1. Buka https://script.google.com/ dengan akun Google pemilik penyimpanan sekolah.
2. Buat proyek bernama **Tata Naskah Dinas - SIT Qudwah**.
3. Ganti isi `Code.gs` dengan file pada folder ini.
4. Buat file HTML bernama `Index`, lalu tempel hasil `gas/Index.html` setelah proses build.
5. Aktifkan tampilan file manifest di Project Settings dan ganti isi `appsscript.json` sesuai file ini.
6. Jalankan `setupWorkspace()` satu kali dari editor. Berikan izin Drive dan Spreadsheet.
7. Pastikan folder **TATA NASKAH DINAS - SIT QUDWAH** dan spreadsheet **DATABASE TATA NASKAH DINAS - SIT QUDWAH** sudah dibuat.
8. Deploy > New deployment > Web app. Jalankan sebagai **User accessing the web app** dan pilih akses **Anyone with Google account** (label UI Google dapat sedikit berbeda).
9. Buka URL berakhiran `/exec` untuk pengujian.

## Pengguna sekolah
- Akun pemilik yang menjalankan `setupWorkspace()` menjadi admin pertama.
- Admin dapat menambahkan email guru/karyawan melalui fungsi `addSchoolUser(email, nama, jabatan, role)`.
- Role yang didukung: `admin`, `editor`, `pembaca`.
- Fungsi ini juga membagikan folder Drive pusat ke pengguna sesuai role.
- Pengguna harus login menggunakan akun Google yang didaftarkan.

## Penting
- Jangan memilih akses anonim/publik. Backend memeriksa email aktif dan daftar pengguna pada sheet `Users`.
- Dengan mode eksekusi sebagai pengguna yang mengakses, setiap pengguna memberikan izin Google dan file pusat dibagikan kepada mereka.
- Uji akun pengguna kedua sebelum dipakai operasional.
- Apps Script dan Drive memiliki kuota layanan; penggunaan besar/serentak perlu dipantau.
- Integrasi UI, penyimpanan draf otomatis, arsip PDF, serta pengujian build/browser masih merupakan tahapan pengembangan; jangan gunakan untuk arsip resmi sebelum pengujian end-to-end selesai.

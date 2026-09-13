# APP PROJECT PWA

## Fitur
- PWA / installable
- Offline cache dengan Service Worker
- IndexedDB auto-save
- Multi project
- Multi URL, Text/Folder, URL, Catatan
- Drag & drop
- Export / Import JSON
- Kompatibel backup format lama
- Google Sheets backup
- Riwayat 20 backup terakhir
- Restore versi backup tertentu
- API Key sederhana untuk endpoint Google Apps Script

## Upload ke GitHub Pages
1. Buat repository baru.
2. Upload semua isi folder ini ke root repository.
3. Commit.
4. Settings > Pages.
5. Source: Deploy from a branch.
6. Branch: main, folder: /(root).
7. Simpan dan buka URL GitHub Pages.

## Google Sheets
1. Buat Google Spreadsheet.
2. Extensions > Apps Script.
3. Tempel Code.gs.
4. Project Settings > Script Properties.
5. Tambahkan:
   - Name: BACKUP_API_KEY
   - Value: buat API key panjang dan rahasia
6. Deploy > New deployment > Web app.
7. Execute as: Me.
8. Who has access: pilih akses yang sesuai kebutuhan.
9. Salin URL /exec.
10. Masukkan URL dan API Key pada aplikasi.

## Catatan keamanan
API key pada aplikasi ini adalah perlindungan dasar. Jangan gunakan endpoint publik ini untuk data sangat sensitif. Untuk keamanan lebih tinggi gunakan autentikasi Google/OAuth atau backend sendiri.

## File
- index.html : aplikasi
- manifest.json : konfigurasi PWA
- sw.js : offline service worker
- icons/ : icon PWA
- Code.gs : backend Google Apps Script

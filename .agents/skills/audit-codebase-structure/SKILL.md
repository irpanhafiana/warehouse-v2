---
name: audit-codebase-structure
description: >-
  Use this skill when auditing, reviewing, or planning refactoring of folder structures, file naming conventions, and barrel exports across the codebase to ensure maintainability and production safety.
---

# Codebase Structure & File Naming Audit Skill

Skill ini bertugas memindai arsitektur folder dan penamaan file di proyek Angular 21 (Warehouse V2), mengidentifikasi ambiguitas penamaan, serta memberikan saran refactoring yang **100% aman untuk production** (zero breaking changes).

---

## 1. Aturan Baku Penamaan & Struktur (AGENTS.md)

1. **Folder Conventions**:
   - Fitur bisnis wajib di `src/app/features/<feature-name>/`.
   - Subfolder fitur terpisah: `pages/`, `components/`, dan `<feature>.routes.ts`.
   - Huruf kecil, kebab-case (contoh: `inventory-request`, `goods-delivery`).
   - Hindari singkatan yang ambigu (misal: `reqtrans-*` berpotensi membingungkan; lebih jelas `request-transfers-*` atau submodul).

2. **File Naming Conventions**:
   - Komponen halaman: `<name>.component.ts`, `<name>.component.html`.
   - Model / Interface: `<name>.model.ts` (disimpan di `src/app/core/models/`).
   - Service: `<name>.service.ts` (disimpan di `src/app/core/services/` atau lokal fitur).
   - Route file: `<feature>.routes.ts`.

3. **Feature Isolation & Barrels**:
   - Fitur tidak boleh mengimpor private component dari fitur lain secara silang (cross-feature coupling).
   - Logika reusable wajib diangkat ke `src/app/shared/` atau `src/app/core/`.

---

## 2. Prinsip Keamanan Production (Safety First)

> [!CAUTION]
> **JANGAN PERNAH** merename file atau memindahkan folder secara langsung tanpa melalui prosedur audit referensi berikut!

Sebelum merekomendasikan atau mengeksekusi penggantian nama:
1. **Lakukan Cross-Reference Grep**:
   Periksa seluruh kemunculan path/nama file di:
   - `src/app/app.routes.ts` (Lazy loaded route imports).
   - Semua file `.ts` (import statement).
   - `angular.json` (assets, styles, scripts).
   - Build konfigurasi atau Capacitor configs.
2. **Periksa Dynamic Imports**:
   Cek apakah rute menggunakan `loadComponent: () => import('./path/to/file')`.
3. **Tahapan Rename yang Aman**:
   - Sediakan mapping tabel jelas: `Path Lama` -> `Path Baru`.
   - Siapkan update import otomatis di file pemanggil.
   - Buat commit terisolasi khusus penamaan file agar riwayat git tetap terlacak.

---

## 3. Format Output Audit

Ketika skill ini dijalankan, agen WAJIB menghasilkan laporan dengan struktur:

### A. Temuan Struktur & Penamaan yang Berpotensi Membingungkan
Daftar file/folder yang:
- Menggunakan singkatan membingungkan (misal: `reqtrans-`).
- Tidak berada pada folder yang semestinya (misal: reusable component yang ditaruh di dalam folder pages fitur tertentu).
- Nama class tidak cocok dengan nama file.

### B. Analisis Dampak & Referensi (Dependency Impact)
Tabel referensi file yang terhubung:
| File Lama | Usulan Nama Baru | File Lain yang Meng-import | Tingkat Risiko |
| :--- | :--- | :--- | :--- |

### C. Rekomendasi Langkah Bertahap (Action Plan)
Urutan eksekusi aman tanpa membuat production build pecah/error.

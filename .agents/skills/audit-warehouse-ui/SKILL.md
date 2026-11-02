---
name: audit-warehouse-ui
description: >-
  Use this skill when auditing, reviewing, or refactoring UI components and templates to ensure strict compliance with Warehouse V2 Design System standards and AGENTS.md guidelines.
---

# Warehouse V2 UI Audit Skill

Gunakan checklist dan prosedur berikut untuk memvalidasi template (`.html`) dan styling komponen agar selaras dengan standar antarmuka Warehouse V2 (mengacu pada `picking-list.component.html`).

---

## 1. Aturan Larangan Keras (Violations to Flag)

Periksa template dan pastikan **TIDAK** ada elemen berikut:
- [ ] **Border Tebal / Kasar**: Hindari `border-4`, `border-2` berlebih, atau `border-black`.
- [ ] **Sudut Terlalu Bulat**: Hindari `rounded-3xl` pada kartu/kontainer standar (gunakan `rounded-xl`).
- [ ] **Neo-Brutalist Shadow**: Hindari bayangan hitam pekat atau style `box-shadow: 0px 4px 0px black`.
- [ ] **Legacy Angular Directives**: Dilarang menggunakan `*ngIf`, `*ngFor`, atau `*ngSwitch` (wajib `@if`, `@for`, `@switch`).
- [ ] **Legacy Class Binding**: Hindari `ngClass` atau `ngStyle` jika bisa menggunakan `[class.active]="..."` atau `[class]="..."`.

---

## 2. Checklist Standar Desain Warehouse V2

### A. Komponen Kartu (Cards)
- **Standard Card**:
  ```html
  <div class="w-full bg-white border border-gray-200 rounded-xl p-4 shadow-xs transition-all">
  ```
- **Selected / Success Card**:
  ```html
  <div class="bg-emerald-300 border border-emerald-300 rounded-xl p-4">
  ```
- **In-Progress / Warning Card**:
  ```html
  <div class="bg-amber-50 border border-amber-300 rounded-xl p-4">
  ```
- **Sub-card / Detail Item**:
  ```html
  <div class="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
  ```

### B. Tombol (Buttons)
Wajib menggunakan utility class flat dari `src/styles.css`:
- Utama: `btn-no-shadow-primary`
- Sekunder / Batal: `btn-no-shadow-secondary`
- Sukses / Selesai: `btn-no-shadow-success`
- Bahaya / Hapus: `btn-no-shadow-danger`
- Peringatan: `btn-no-shadow-warning`
- Varian kecil: `btn-sm-no-shadow-*`

### C. Input Form
- **Di Header Gelap (`bg-checkout`)**:
  - Label: `font-medium text-xs uppercase tracking-wider text-white/90 pl-1`
  - Input: `w-full text-sm sm:text-base p-2.5 border border-white/20 focus:border-white focus:outline-none rounded-xl bg-white text-gray-800 font-semibold shadow-xs`
- **Di Body / Modal Terang**:
  - Input: `w-full p-2.5 sm:p-3 bg-white border border-gray-300 focus:border-checkout rounded-xl text-base font-semibold text-gray-800 focus:outline-none shadow-xs`

### D. Modal / Dialog
- Backdrop: `fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-modal-backdrop`
- Kontainer: `w-full max-w-md bg-white rounded-2xl p-6 border border-gray-200 shadow-2xl animate-modal-card flex flex-col gap-4`

---

## 3. Prosedur Eksekusi Audit

Ketika pengguna meminta audit file template:
1. Baca file template (`.html`) dan style/ts terkait.
2. Identifikasi baris yang melanggar poin 1.
3. Berikan laporan ringkas:
   - **Status**: Lolos / Perlu Perbaikan.
   - **Pelanggaran Ditemukan**: Sebutkan nomor baris dan class yang tidak sesuai standar.
   - **Rekomendasi Perbaikan (Diff)**: Berikan potongan kode pengganti yang sudah sesuai standar Warehouse V2.

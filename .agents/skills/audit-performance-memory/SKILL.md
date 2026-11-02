---
name: audit-performance-memory
description: >-
  Use this skill when auditing, profiling, or optimizing Angular application performance, memory leaks, RxJS subscription cleanup, SignalR connection lifecycles, and Zoneless OnPush rendering efficiency.
---

# Angular Performance & Memory Leak Audit Skill

Skill ini bertugas memindai kode TypeScript (`.ts`) dan template (`.html`) di proyek Warehouse V2 untuk menemukan potensi **Memory Leaks**, overhead rendering, serta inefisiensi reaktivitas pada platform Web dan Android (Capacitor).

---

## 1. Aturan Deteksi Memory Leak (Critical Flags)

Setiap temuan berikut WAJIB ditandai sebagai potensi kebocoran memori:

### A. RxJS Observables Tanpa Auto-Cleanup
- **Pelanggaran**: Memanggil `.subscribe()` di dalam komponen tanpa mekanisme pembersihan.
- **Standar Angular 21**:
  Wajib menggunakan `takeUntilDestroyed()` dari `@angular/core/rxjs-interop`:
  ```typescript
  // SALAH (Bocor memori)
  this.service.getData().subscribe(data => this.items.set(data));

  // BENAR (Auto-cleanup via destroyRef)
  private readonly destroyRef = inject(DestroyRef);
  this.service.getData().pipe(
    takeUntilDestroyed(this.destroyRef)
  ).subscribe(data => this.items.set(data));

  // ATAU konversi langsung ke Signal
  readonly items = toSignal(this.service.getData(), { initialValue: [] });
  ```

### B. SignalR / WebSocket Event Handlers
- **Pelanggaran**: Mendaftarkan listener `signalrService.hubConnection.on('EventName', ...)` tanpa memanggil `.off('EventName')` atau tanpa diikat ke lifecycle komponen.
- **Solusi**: Pastikan handler dibersihkan pada `ngOnDestroy()` atau gunakan stream Observable yang ditutup dengan `takeUntilDestroyed()`.

### C. Timer & Global Event Listeners
- **Pelanggaran**: `setInterval()`, `setTimeout()` panjang, atau `window.addEventListener()` (misal: hardware barcode scanner input) yang tidak di-`clearInterval` / `removeEventListener` saat komponen dihancurkan.

---

## 2. Aturan Efektivitas Reaktivitas & Rendering (Zoneless)

### A. Change Detection Strategy
- Seluruh komponen **WAJIB** mencantumkan:
  ```typescript
  changeDetection: ChangeDetectionStrategy.OnPush
  ```
- Hindari *property mutation* biasa setelah callback asinkron; selalu gunakan Angular Signals (`signal()`, `computed()`) untuk memicu render DOM.

### B. Optimalisasi `@for` Loop
- **Pelanggaran**: Menggunakan `track $index` pada daftar item yang dinamis (sering di-filter, dihapus, atau di-reorder). Hal ini memaksa browser me-render ulang seluruh card.
- **Standar**:
  ```html
  @for (item of items(); track item.DocNum) { ... }
  ```

### C. Hindari Pemanggilan Method di Template
- **Pelanggaran**: Mengikat ekspresi template ke method fungsi biasa, contoh:
  ```html
  <div>{{ calculateTotal(item) }}</div>
  ```
  Method akan dieksekusi berulang kali pada setiap siklus deteksi perubahan.
- **Standar**: Gunakan Pipe murni (`MyCustomPipe`) atau `computed()` signal.

---

## 3. Prosedur Eksekusi Audit

Ketika pengguna meminta audit performa / memory leak:
1. **Pindai `.subscribe()`**: Cari semua kemunculan `.subscribe(` di folder atau file yang diminta.
2. **Periksa Operator Cleanup**: Cek apakah sebelum `.subscribe(` ada `takeUntilDestroyed`, `take(1)`, atau disimpan ke `Subscription` yang di-unsubscribe pada `ngOnDestroy`.
3. **Pindai Lifecycle SignalR & Interval**: Cek pendaftaran listener event eksternal.
4. **Pindai `@for` Track Expression**: Cek apakah looping data besar memakai tracking ID unik.
5. **Sajikan Laporan**:
   - **Tingkat Keparahan**: High (Kebocoran pasti), Medium (Inefisiensi rendering), Low (Saran optimasi).
   - **Baris Kode & File**: Lokasi persis temuan.
   - **Solusi Kode (Diff)**: Kode perbaikan modern Angular 21.

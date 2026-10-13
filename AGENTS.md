# AGENTS.md — Angular Senior Developer Guidelines

> Industry standard guide for AI Coding Agents and Senior Engineers working on this codebase.  
> Stack: **Angular 21+ (Modern Standalone Architecture)**, **TypeScript 5.9+**, **Tailwind CSS v4**, **Capacitor 8+ (Android)**, **RxJS / Signals**, **SignalR**.

---

## 1. Project Philosophy & Core Stack

- **Angular Version**: Angular 21 (Zoneless-ready / Zoneless-friendly, Standalone Components by default).
- **Styling**: Tailwind CSS v4 (`@import "tailwindcss";` in `src/styles.css`).
- **Platform**: Web SPA + Hybrid Mobile via Capacitor (`@capacitor/android`, `@capacitor/core`).
- **Data Flow**: Reactive paradigm with RxJS `Observable` for async HTTP/WebSocket streams; Angular Signals for local state management when applicable.
- **Strict Typing**: Zero `any` where types can be modeled. Explicit interfaces in `src/app/core/models/`.

---

## 2. Architecture & Directory Structure

Follow the Feature-Driven Angular Architecture:

```text
src/app/
├── core/                  # Singleton services, interceptors, models, app-level guards
│   ├── interceptors/      # HTTP interceptors (functional preferred)
│   ├── models/            # Domain models and TypeScript contracts
│   └── services/          # Core API services (providedIn: 'root')
├── features/              # Business domain modules/routes (lazy loaded)
│   ├── [feature-name]/
│   │   ├── pages/         # Route-level page components
│   │   ├── components/    # Feature-specific presenter components
│   │   └── [feature].routes.ts # Feature routing definition
├── layouts/               # Shell layouts (Navbar, Sidebar, App Layouts)
├── shared/                # Dumb/reusable UI components, pipes, directives
│   ├── components/        # Cards, loaders, modal dialogs, buttons
│   └── pipes/             # Transformation pipes
└── environments/          # Environment configuration (dev vs prod)
```

### Golden Rules for Modules and Dependencies
1. **No `NgModule`**: Everything must be standalone (`standalone: true` or default in v17+).
2. **Feature Isolation**: Features must never import private components from other features. Reusable logic must be lifted to `shared/` or `core/`.
3. **Barrels (`index.ts`)**: Keep public APIs clean using entry point exports in `index.ts`.

---

## 3. Angular 21 Modern Syntax & Patterns

### 3.1 Control Flow (Mandatory)
Always use modern control flow. **Never use legacy `*ngIf`, `*ngFor`, or `*ngSwitch`**.

```html
<!-- Correct -->
@if (loading()) {
  <app-loader></app-loader>
} @else if (data().length > 0) {
  @for (item of data(); track item.id; let i = $index) {
    <app-item-card [item]="item" />
  }
} @else {
  <app-empty-state />
}
```

### 3.2 Dependency Injection
Use `inject()` function over constructor-based injection for clean composition:

```typescript
// Recommended
export class SalesInvoiceComponent {
  private readonly service = inject(SalesInvoiceService);
  private readonly router = inject(Router);
  private readonly toastr = inject(ToastrService);
}
```

### 3.3 Signals & Reactive State
- Use **Signals** (`signal()`, `computed()`) for component UI state.
- Keep **RxJS** for event streams, debounce/switchMap operations, SignalR real-time messages, and HTTP calls.
- Use `toSignal()` or `takeUntilDestroyed()` when bridging RxJS observables to component lifecycle.

```typescript
readonly searchQuery = signal('');
readonly filteredItems = computed(() => 
  this.items().filter(item => item.name.toLowerCase().includes(this.searchQuery().toLowerCase()))
);
```

### 3.4 Change Detection
- Enforce `changeDetection: ChangeDetectionStrategy.OnPush` on all components to maximize performance and avoid unnecessary change detection cycles.

---

## 4. UI / Design System Standards (Warehouse V2)

The UI standard follows [`picking-list.component.html`](file:///d:/github/warehouse-v2/src/app/features/picking/pages/picking-list/picking-list.component.html) and modern clean card design.

### 4.1 Card Guidelines
- **Standard Card**: Flat, modern 1px border with light background:
  ```html
  <div class="w-full bg-white border border-gray-200 rounded-xl p-4 shadow-xs transition-all">
  ```
- **Highlighted / Status Cards**:
  - Success / Selected: `bg-emerald-50 border border-emerald-300 rounded-xl`
  - In Progress / Warning: `bg-amber-50 border border-amber-300 rounded-xl`
  - Subcard / Inner details: `bg-gray-50 rounded-xl p-2.5 border border-gray-100`
- **AVOID**: Heavy borders (`border-4`, `border-black`), excessive roundedness (`rounded-3xl` for standard cards), and neo-brutalist shadows (`box-shadow: 0px 4px 0px black`).

### 4.2 Button Classes
Use the defined flat utility classes in `src/styles.css`:
- Primary Action: `btn-no-shadow-primary`
- Secondary / Dismiss: `btn-no-shadow-secondary`
- Danger / Cancel: `btn-no-shadow-danger`
- Success / Complete: `btn-no-shadow-success`
- Warning / Attention: `btn-no-shadow-warning`
- Small variants: `btn-sm-no-shadow-*`
- Header Icon Button:
  ```html
  <button type="button" class="w-13 h-13 flex items-center justify-center bg-[#202B6D] hover:bg-[#1a235b] border border-white/20 active:scale-95 rounded-xl p-2.5   transition-all cursor-pointer">
    <img src="icon.png" alt="Icon" class="w-full h-full object-contain" />
  </button>
  ```

### 4.3 Form Inputs & Dropdowns
- **On Dark Header** (`bg-checkout`):
  ```html
  <label class="font-medium text-xs uppercase tracking-wider text-white/90 pl-1">Label</label>
  <input class="w-full text-sm sm:text-base p-2.5 border border-white/20 focus:border-white focus:outline-none rounded-xl bg-white text-gray-800 font-semibold shadow-xs" />
  ```
- **In Light Body / Modal**:
  ```html
  <input class="w-full p-2.5 sm:p-3 bg-white border border-gray-300 focus:border-checkout rounded-xl text-base font-semibold text-gray-800 focus:outline-none shadow-xs" />
  ```

### 4.4 Modals & Dialogs
- Backdrop:
  `fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-modal-backdrop`
- Modal Container:
  `w-full max-w-md bg-white rounded-2xl p-6 border border-gray-200 shadow-2xl animate-modal-card flex flex-col gap-4`

---

## 5. Network & API Guidelines

1. **Environment Configuration**:
   - Always reference endpoints via `environment.api` or `environment.signalRapi`.
   - Never hardcode IP addresses or API tokens directly inside services or components.
   - Respect file replacements in `angular.json` (`environment.ts` for prod vs `environment.development.ts` for dev).

2. **HTTP Interceptors**:
   - Authentication tokens and global errors are intercepted in `src/app/core/interceptors/`.
   - Use `IdempotencyService` or request locking for critical mutating endpoints (e.g. queue submission, checkout submit).

3. **SignalR / Real-Time Events**:
   - Manage connection state responsibly in `SignalrService`.
   - Subscriptions to real-time events must be cleaned up on component destruction or handled via reactive operators.

---

## 6. Capacitor & Android Considerations

- **Cordova/Capacitor Bridging**: Remember the app executes in a WebView inside Android.
- **Assets Sync**: After building web code with `ng build`, always synchronize via `npx cap sync android`.
- **Hardware Integration**: Barcode scanner, camera, or push notifications must use verified Capacitor plugins or fallback web APIs gracefully.
- **Safe Areas**: Account for top status bars and bottom navigation bars on Android devices (avoid content cutoff).

---

## 7. Developer Workflow & Quality Checklist

Before completing any task, ensure:
1. **Compilation**: `npx ng build` or `npm run build` exits with code `0`.
2. **Preserve Logic**: When refactoring or updating UI, never remove or alter business logic, event handlers, or data-binding directives unless explicitly instructed.
3. **No Unused Imports**: Keep imports pruned and alphabetized where possible.
4. **Performance**: Avoid memory leaks — unsubscribe from long-lived RxJS subscriptions or use `takeUntilDestroyed()`.

---

## 8. Communication & Response Style (Mandatory)

1. **On Point & Direct**: Jawab langsung ke inti persoalan tanpa bertele-tele, tanpa basa-basi pembuka/penutup yang tidak perlu.
2. **Action-Oriented**: Fokus pada solusi konkret, kode yang presisi, atau status eksekusi.
3. **Concise Explanations**: Jika penjelasan dibutuhkan, berikan seringkas dan sejelas mungkin dalam bentuk poin-poin singkat.


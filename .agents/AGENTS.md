# AGENTS.md — Angular Senior Developer Guidelines

> Industry standard guide for AI Coding Agents and Senior Engineers working on this codebase.  
> Stack: **Angular 21+ (Zoneless & Implicit Standalone Architecture)**, **TypeScript 5.9+**, **Tailwind CSS v4**, **Capacitor 8+ (Android)**, **RxJS / Signals**, **SignalR**.

---

## 1. Project Philosophy & Core Stack

- **Angular Version**: Angular 21 (`provideZonelessChangeDetection()`, Implicit Standalone Components by default).
- **Styling**: Tailwind CSS v4 (`@import "tailwindcss";` in `src/styles.css`).
- **Platform**: Web SPA + Hybrid Mobile via Capacitor (`@capacitor/android`, `@capacitor/core`).
- **Data Flow**: Reactive paradigm with Angular Signals for synchronous/local UI state; RxJS `Observable` for event streams, SignalR real-time messages, and complex async pipelines; `httpResource` / `rxResource` for reactive data fetching.
- **Strict Typing**: Zero `any` where types can be modeled. Explicit interfaces in `src/app/core/models/`.

---

## 2. Architecture & Directory Structure

Follow the Feature-Driven Angular Architecture:

```text
src/app/
├── core/                  # Singleton services, interceptors, models, app-level guards
│   ├── interceptors/      # HTTP interceptors (functional HttpInterceptorFn preferred)
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
1. **Implicit Standalone**: Do NOT use `NgModule`. Do NOT explicitly write `standalone: true` inside `@Component`, `@Directive`, or `@Pipe` decorators (it is default in Angular 19+).
2. **Feature Isolation**: Features must never import private components from other features. Reusable logic must be lifted to `shared/` or `core/`.
3. **Barrels (`index.ts`)**: Keep public APIs clean using entry point exports in `index.ts`.

---

## 3. Angular 21 Modern Syntax & Patterns

### 3.1 Control Flow (Mandatory)
Always use built-in modern control flow (`@if`, `@for`, `@switch`, `@let`, `@defer`). **Never use legacy `*ngIf`, `*ngFor`, or `*ngSwitch`**.

```html
<!-- Correct -->
@let items = data();
@if (loading()) {
  <app-loader />
} @else if (items.length > 0) {
  @for (item of items; track item.id; let i = $index) {
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

### 3.3 Signals, Component APIs & Reactive State
- **Signal APIs (Mandatory)**: Never use `@Input()`, `@Output()`, `@ViewChild()`, or `@ContentChild()` decorators. Always use function-based signal APIs:
  - Inputs: `readonly item = input.required<Item>();` or `readonly label = input('Default');`
  - Two-way binding: `readonly checked = model(false);`
  - Outputs: `readonly saved = output<Item>();`
  - Queries: `readonly searchInput = viewChild<ElementRef>('searchInput');`
- **State Management**:
  - Use `signal()` and `computed()` for component UI state.
  - Use `linkedSignal()` for mutable state that resets when a source signal changes.
  - Avoid `effect()` for state synchronization; only use `effect()` for DOM manipulation, logging, or third-party non-reactive APIs.
- **RxJS Interop**: Keep RxJS for complex event streams, debounce/switchMap operations, SignalR real-time messages, and HTTP calls. Bridge using `toSignal()`, `toObservable()`, `rxResource()`, `httpResource()`, or `takeUntilDestroyed()`.

```typescript
// Recommended Angular 21 Component Pattern
@Component({
  selector: 'app-item-card',
  templateUrl: './item-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'block w-full',
    '(click)': 'onCardClick()'
  }
})
export class ItemCardComponent {
  readonly item = input.required<WarehouseItem>();
  readonly selected = output<string>();

  readonly searchQuery = signal('');
  readonly isHighlighted = computed(() => this.item().qty > 100);

  onCardClick(): void {
    this.selected.emit(this.item().id);
  }
}
```

### 3.4 Zoneless & Change Detection
- Enforce `changeDetection: ChangeDetectionStrategy.OnPush` on all components.
- Because the app is Zoneless-ready, **never rely on plain property mutations** after async callbacks to update the DOM. All state changes affecting the view must go through **Signals** or `AsyncPipe`.

### 3.5 Host Bindings & Template Syntax
- **Host Metadata**: Prefer the `host: { ... }` property inside `@Component` over `@HostBinding` and `@HostListener` decorators.
- **Self-Closing Tags**: Always use self-closing tags for components without projected content in templates (e.g., `<app-loader />` instead of `<app-loader></app-loader>`).
- **Class & Style Bindings**: Prefer native `[class.active]="isActive()"` or `[class]="computedClasses()"` over `ngClass` and `ngStyle`.

---

## 4. UI / Design System Standards (Warehouse V2)

The UI standard follows [`picking-list.component.html`](src/app/features/picking/pages/picking-list/picking-list.component.html) and modern clean card design.

### 4.1 Card Guidelines
- **Standard Card**: Flat, modern 1px border with light background:
  ```html
  <div class="w-full bg-white border border-gray-200 rounded-xl p-4 shadow-xs transition-all">
  ```
- **Highlighted / Status Cards**:
  - Success / Selected: `bg-emerald-300 border border-emerald-300 rounded-xl`
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
  <button type="button" class="w-13 h-13 flex items-center justify-center bg-[#202B6D] hover:bg-[#1a235b] border border-white/20 active:scale-95 rounded-xl p-2.5 transition-all cursor-pointer">
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
   - Authentication tokens and global errors are intercepted in `src/app/core/interceptors/` using functional `HttpInterceptorFn`.
   - Use `IdempotencyService` or request locking for critical mutating endpoints (e.g., queue submission, checkout submit).

3. **SignalR / Real-Time Events**:
   - Manage connection state responsibly in `SignalrService`.
   - Subscriptions to real-time events must be cleaned up on component destruction via `takeUntilDestroyed()` or converted to Signals cleanly.

---

## 6. Capacitor & Android Considerations

- **Cordova/Capacitor Bridging**: Remember the app executes in a WebView inside Android.
- **Assets Sync**: After building web code with `ng build`, always synchronize via `npx cap sync android`.
- **Hardware Integration**: Barcode scanner, camera, or push notifications must use verified Capacitor plugins or fallback web APIs gracefully.
- **Safe Areas**: Account for top status bars and bottom navigation bars on Android devices (avoid content cutoff).
- **APK Production Release Versioning**: Setiap kali ada perintah untuk **build APK PRODUCTION RELEASE**, WAJIB melakukan auto-increment pada ndroid/app/build.gradle sebelum proses build:
  - `versionCode`: increment bertambah 1 (contoh: `2` -> `3`).
  - `versionName`: increment patch version bertambah 1 (contoh: `"1.0.1"` -> `"1.0.2"`).
  - Pastikan juga versi yang ditampilkan di UI (`appVersion` di `src/app/features/auth/pages/login/login.component.ts`) diselaraskan dengan `versionName` baru tersebut.

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

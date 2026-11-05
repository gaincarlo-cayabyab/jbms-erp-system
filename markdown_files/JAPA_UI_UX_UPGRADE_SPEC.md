# JAPA Global — Enterprise Operations
## Technical Specification: UI/UX, Branding & Layout Architecture Upgrade

### 1. Vision & Core System Identity
- **System Brand Name:** JAPA Global — Enterprise Operations
- **Target Deployment Domain:** `japa-erp-system.vercel.app`
- **Primary Business:** Multi-store retail & 7-stage customized apparel/sublimation production management.

---

### 2. Layout Shell Standardization & Bug Resolution
#### Root Cause:
`app/payroll/page.tsx` (and potentially other sub-routes) was constructed as a standalone full-width screen without wrapping inside `<DashboardShell>` or implementing a dedicated `layout.tsx`, causing the global sidebar, top navigation, and header metrics to disappear.

#### Resolution Rules:
1. Ensure `components/dashboard-shell.tsx` wraps all top-level routes:
   - `app/page.tsx` (Executive Dashboard)
   - `app/customers/page.tsx` & `app/crm/page.tsx` (CRM)
   - `app/sales/page.tsx` (Sales & Quotations)
   - `app/production/page.tsx` (7-Stage Production Queue)
   - `app/inventory/page.tsx` (Multi-Store Stock)
   - `app/financials/page.tsx` (Expenses & Cash Flow)
   - `app/payroll/page.tsx` (Attendance & Disbursements)
2. Add dynamic breadcrumbs and current route context to the top navigation header.
3. Ensure sidebar collapsing state is persistent across page navigation using React State / LocalStorage.

---

### 3. JAPA Global Visual Design System & Brand Palette
#### Asset Configuration:
- Copy/move `assets/images/JAPA_logo` / `JAPA_logo.jpg` into `public/images/japa-logo.png`.
- Provide crisp background masking and dark/light mode compatibility.

#### Color Palette Specification (`tailwind.config.ts` & `globals.css`):
- **Primary Royal Blue:** `#0B3BBE` (Used for active buttons, key indicators, primary branding)
- **Accent Crimson Red:** `#D3122A` (Used for alert states, delayed badges, overdue balances, active highlights)
- **Dark Slate Background:** `#101828` (Sidebar background, top bar accents)
- **Light Off-White Surface:** `#F8FAFC` (Card backgrounds and page surface)
- **Border Neutral:** `#E2E8F0`

#### Typography & Numeric Formatting:
- Apply tabular numbers (`font-mono` / `font-variant-numeric: tabular-nums`) across all currency tables ($\text{₱}$ amounts), quantity levels, and Job Order identifiers to ensure tabular alignment.

---

### 4. Split-Screen Auth & Login Page Redesign (`app/login/page.tsx`)
#### Layout Structure:
- **Left Panel (Brand Showcase - 50% width on Desktop):**
  - Rich dark gradient background (`#101828` to `#0B3BBE`).
  - High-resolution `japa-logo.png` with subtle glow effect.
  - Live metric feature highlights:
    - *Multi-Store Branch Management*
    - *7-Stage Sublimation & Apparel Pipeline*
    - *Real-time Executive Analytics & Financials*
  - Geometric background grid pattern overlay (`bg-grid-white/[0.05]`).
- **Right Panel (Authentication Card - 50% width on Desktop):**
  - Clean floating card layout.
  - Sign-in tab & Quick 1-Click Demo role access tabs (Admin, Store Manager, Production Staff).
  - Smooth loading indicators on button submit with immediate redirect logic upon session validation.

---

### 5. UI Components, Skeletons, Animations & Notifications
#### Loading States & Transitions:
1. **Skeleton Loaders:** Add shimmer skeleton components (`components/ui/skeleton.tsx`) to every table view during Supabase async data fetching.
2. **Page Progress Bar:** Add top edge page transition loader during Next.js router transitions.
3. **Button Protection:** Add inline loader spinners and `disabled={loading}` states to all form submit buttons to prevent double-click submissions.

#### Toast Notifications:
- Integrate `sonner` or `react-hot-toast` in `app/layout.tsx`.
- Trigger interactive toasts in the bottom-right corner for:
  - Job Order status updates (e.g., "Moved to Heat Press stage").
  - Attendance logs and payroll batch approvals.
  - Inventory level adjustments and product creations.

---

### 6. Header & Store Switcher Enhancement
- Add a top-bar **Branch / Store Selector** dropdown:
  - Options: `All Stores (Consolidated)`, `Main Branch`, `North Branch`, `South Branch`.
- Display active user details, role badge (`Admin`, `Store Manager`, `Production Staff`), and a 1-click Sign Out button with confirmation modal.
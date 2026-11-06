# Comprehensive ERP Multi-Branch & Touch-Optimized Architecture Plan

## Executive Summary

This document establishes the technical blueprint, data architecture, user experience standards, security matrix, and execution roadmap for expanding the Enterprise Resource Planning (ERP) platform. The platform is designed to seamlessly support multi-branch operations—specifically integrating **Dagupan Main Branch** and **Manila Branch**—while delivering an optimized touchscreen interface for tablet devices (e.g., iPads, Android tablets) used in POS and inventory terminals.

---

## 1. Multi-Branch Architecture & Data Isolation

### 1.1 Core Tenant & Branch Data Isolation
To ensure complete data integrity across locations while supporting consolidated reporting for administrative leadership, every transactional and operational entity is scoped by a mandatory `branch_id`.

```
                     ┌────────────────────────────────────────┐
                     │          Central Supabase DB           │
                     └───────────────────┬────────────────────┘
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   │                                           │
       ┌───────────▼───────────┐                   ┌───────────▼───────────┐
       │  Dagupan Main Branch  │                   │     Manila Branch     │
       │   `branch_id`: dag-1  │                   │   `branch_id`: mnl-1  │
       └───────────┬───────────┘                   └───────────┬───────────┘
                   │                                           │
         ┌─────────┴─────────┐                       ┌─────────┴─────────┐
         │ Local DB / POS    │                       │ Local DB / POS    │
         │ IndexedDB Cache   │                       │ IndexedDB Cache   │
         └───────────────────┘                       └───────────────────┘
```

### 1.2 Core Data Schema Scoping

The following relational entities enforce explicit branch scoping:

```sql
-- Branch Master Table
CREATE TABLE public.branches (
    id VARCHAR(32) PRIMARY KEY, -- e.g., 'dagupan_main', 'manila_branch'
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    contact_number VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Profile Branch Association
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'branch_manager', 'cashier', 'warehouse_staff', 'auditor')),
    primary_branch_id VARCHAR(32) REFERENCES public.branches(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Branch Stock Level Table
CREATE TABLE public.inventory_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id VARCHAR(32) NOT NULL REFERENCES public.branches(id),
    product_id UUID NOT NULL REFERENCES public.products(id),
    quantity_on_hand INT NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
    reorder_level INT NOT NULL DEFAULT 10,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(branch_id, product_id)
);

-- Sales Order Schema
CREATE TABLE public.sales_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(100) UNIQUE NOT NULL,
    branch_id VARCHAR(32) NOT NULL REFERENCES public.branches(id),
    cashier_id UUID NOT NULL REFERENCES public.profiles(id),
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    payment_status VARCHAR(50) NOT NULL CHECK (payment_status IN ('paid', 'pending', 'voided', 'refunded')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.3 Row Level Security (RLS) Policies
Supabase PostgreSQL Row Level Security guarantees that non-admin users cannot access or alter records belonging to another branch.

```sql
-- Enable RLS on core tables
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stock ENABLE ROW LEVEL SECURITY;

-- Helper function to extract user primary branch
CREATE OR REPLACE FUNCTION public.get_user_branch_id()
RETURNS VARCHAR(32) AS $$
    SELECT primary_branch_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper function to check if user is Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'super_admin'
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- RLS Policy: Sales Orders Access
CREATE POLICY "Sales Orders Branch Isolation Policy" ON public.sales_orders
    FOR ALL
    USING (
        is_super_admin() OR branch_id = get_user_branch_id()
    )
    WITH CHECK (
        is_super_admin() OR branch_id = get_user_branch_id()
    );

-- RLS Policy: Inventory Stock Access
CREATE POLICY "Inventory Stock Isolation Policy" ON public.inventory_stock
    FOR ALL
    USING (
        is_super_admin() OR branch_id = get_user_branch_id()
    )
    WITH CHECK (
        is_super_admin() OR branch_id = get_user_branch_id()
    );
```

### 1.4 Inter-Branch Stock Transfer (STO) Workflow
Direct adjustment of branch inventory across locations is strictly prohibited. All cross-branch movements follow a 4-step Stock Transfer Order (STO) state machine:

```
[ STO Created ]  ───>  [ Dispatched ]  ───>  [ In-Transit ]  ───>  [ Received & Verified ]
  (Origin Branch)        (Deduct Origin)                           (Add Destination Stock)
                                                                           │
                                                                           └───> [ Variance Logged ]
                                                                                 (If discrepancy)
```

#### STO Database Schema:
```sql
CREATE TABLE public.stock_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_number VARCHAR(100) UNIQUE NOT NULL,
    source_branch_id VARCHAR(32) NOT NULL REFERENCES public.branches(id),
    destination_branch_id VARCHAR(32) NOT NULL REFERENCES public.branches(id),
    status VARCHAR(50) NOT NULL DEFAULT 'draft' 
        CHECK (status IN ('draft', 'requested', 'dispatched', 'in_transit', 'received', 'variance_flagged', 'cancelled')),
    dispatched_by UUID REFERENCES public.profiles(id),
    received_by UUID REFERENCES public.profiles(id),
    dispatched_at TIMESTAMPTZ,
    received_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.stock_transfer_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id UUID NOT NULL REFERENCES public.stock_transfers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    quantity_sent INT NOT NULL CHECK (quantity_sent > 0),
    quantity_received INT DEFAULT 0 CHECK (quantity_received >= 0),
    variance_reason TEXT
);
```

---

## 2. Tablet & Touch Interface Optimization

### 2.1 UI/UX Design Guidelines for Touchscreens
Operating an ERP on tablets (e.g., Apple iPad $10.2" - 12.9"$, Android tablets $10" - 11"$) demands dedicated ergonomics to prevent tap errors, interface crowding, and fatigue.

* **Minimum Touch Target:** All clickable elements (buttons, table rows, tab switches) must be at least $48 \times 48\text{px}$ with a minimum padding clearance of $8\text{px}$.
* **No Hover Reliance:** All actions triggered by hover on desktop (tooltips, dropdown sub-menus) must be converted to explicit tap toggles, side drawers, or contextual modal action sheets.
* **Thumb-Zone Placement:** Key transactional action buttons (*Complete Order*, *Add Item*, *Scan Barcode*, *Save Draft*) must reside within bottom fixed bars accessible to thumb reach.

### 2.2 Breakpoints & Screen Layout Specifications

| Viewport Range | Target Device | Layout Strategy |
| :--- | :--- | :--- |
| **$768\text{px} - 834\text{px}$** | Tablet Portrait | Single-column stack, collapsible hamburger drawer, full-screen POS receipt sheet. |
| **$1024\text{px} - 1180\text{px}$** | Tablet Landscape | Two-column layout (60% Product Grid / 40% Cart Sidebar), pinned bottom actions. |
| **$\ge 1280\text{px}$** | Desktop / Large Screen | Multi-column table layout, full administrative master-detail panels. |

### 2.3 Tablet POS Terminal Layout Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [≡] Dagupan Main Terminal    Cashier: J. Doe    [Online (Sync: OK)]   [12:45]│
├───────────────────────────────────────────┬─────────────────────────────────┤
│ Search Product / Scan Barcode [ ||||||| ] │ CURRENT ORDER (#ORD-9821)       │
├───────────────────────────────────────────┼─────────────────────────────────┤
│ [ Filter Category v ] [ All ] [ Fast-Sell]│ Item Name          Qty   Price  │
│ ┌──────────────┐ ┌──────────────┐         │ ─────────────────────────────── │
│ │ Oil Filter   │ │ Brake Pad    │         │ Motor Oil 1L        2   ₱900.00 │
│ │ ₱450.00      │ │ ₱1,200.00    │         │ Brake Pad           1 ₱1,200.00 │
│ └──────────────┘ └──────────────┘         │                                 │
│ ┌──────────────┐ ┌──────────────┐         │                                 │
│ │ Spark Plug   │ │ Transmission │         ├─────────────────────────────────┤
│ │ ₱250.00      │ │ ₱3,400.00    │         │ Subtotal:             ₱2,100.00 │
│ └──────────────┘ └──────────────┘         │ Tax (12%):              ₱252.00 │
│                                           │ TOTAL:                ₱2,352.00 │
│                                           ├─────────────────────────────────┤
│                                           │ [ CUSTOM NUMPAD (1-9, C, 0) ]   │
│                                           ├─────────────────────────────────┤
│                                           │ [ DISCOUNT ]  [ PAY NOW (₱) ]   │
└───────────────────────────────────────────┴─────────────────────────────────┘
```

### 2.4 Built-In Custom Touch Numpad & Input Shields
To prevent native web/mobile virtual keyboards from obstructing screen content during fast sales processing:
* Use standard input read-only attributes for quantity and price modification fields, catching touch events to trigger an on-screen custom overlay keypad.
* Provide quick-preset buttons for cash tendered (e.g., `+₱100`, `+₱500`, `+₱1000`, `Exact Amount`).

---

## 3. Role-Based Access Control (RBAC) & Audit Engineering

### 3.1 Master Permission Matrix

| Module / Action | Super Admin / CEO | Branch Manager | POS Cashier | Warehouse Staff | Auditor |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **View Global Multi-Branch Metrics** | ✅ Full | ❌ Restricted | ❌ Restricted | ❌ Restricted | ✅ Read-Only |
| **View Branch Specific Metrics** | ✅ Full | ✅ Own Branch | ❌ Restricted | ❌ Restricted | ✅ Read-Only |
| **Process POS Transaction** | ✅ Full | ✅ Full | ✅ Full | ❌ Restricted | ❌ Restricted |
| **Void Paid Order / Grant Discount** | ✅ Full | ✅ Manager Auth | ❌ Requires Manager | ❌ Restricted | ❌ Restricted |
| **Initiate Stock Transfer (STO)** | ✅ Full | ✅ Full | ❌ Restricted | ✅ Full | ❌ Restricted |
| **Approve STO Receipt** | ✅ Full | ✅ Full | ❌ Restricted | ✅ Full | ❌ Restricted |
| **Manual Stock Override / Wipe** | ✅ Full | ❌ Needs Approval | ❌ Restricted | ❌ Restricted | ❌ Restricted |
| **Manage Users & Security Roles** | ✅ Full | ❌ Restricted | ❌ Restricted | ❌ Restricted | ❌ Restricted |
| **Inspect System Audit Logs** | ✅ Full | ✅ Own Branch | ❌ Restricted | ❌ Restricted | ✅ Full |

### 3.2 Audit Logging & Ledger Architecture
All system modifications—including row edits, status updates, overrides, and logins—are automatically published to an immutable audit table.

```sql
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES public.profiles(id),
    branch_id VARCHAR(32) REFERENCES public.branches(id),
    action_type VARCHAR(100) NOT NULL, -- e.g., 'PRICE_OVERRIDE', 'STOCK_TRANSFER_INIT'
    entity_name VARCHAR(100) NOT NULL, -- e.g., 'sales_orders'
    entity_id VARCHAR(100) NOT NULL,
    previous_state JSONB,
    new_state JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- Indexing for fast analytical query filtering
CREATE INDEX idx_audit_branch_timestamp ON public.audit_logs(branch_id, timestamp DESC);
CREATE INDEX idx_audit_action ON public.audit_logs(action_type);
```

### 3.3 System Admin Delegation & Impersonation System
To facilitate rapid remote support and operational troubleshooting without credential sharing:
1. Super Admins can activate a temporary **"View As Branch"** session token.
2. The UI environment adapts immediately to mimic the selected target branch's view (e.g., viewing Manila POS from Dagupan Main HQ).
3. Any action performed while in impersonation state writes to `audit_logs` with a flag: `impersonated_by: <admin_uuid>`.

---

## 4. Connectivity, Offline Capability & Realtime Sync Protocol

### 4.1 Offline-First IndexedDB Architecture
To safeguard against connectivity loss at the Manila or Dagupan branches, POS checkout and inventory lookup rely on a client-side database cache using Progressive Web App (PWA) web storage standards (`IndexedDB`).

```
                              ┌───────────────────────────┐
                              │    User Cashier Action    │
                              └─────────────┬─────────────┘
                                            │
                                   Is Network Online?
                                     /             \
                                (Yes)               (No)
                                 /                     \
                   ┌────────────▼────────────┐   ┌──────▼────────────────────┐
                   │ POST to Supabase API    │   │ Write to Local IndexedDB  │
                   └────────────┬────────────┘   │ Transaction Queue         │
                                │                └──────┬────────────────────┘
                   ┌────────────▼────────────┐          │
                   │ Update Local Cache      │          │ (On Network Restored)
                   └─────────────────────────┘          │
                                                        └───> Sync Queue Engine
```

### 4.2 Offline Queue Management Schema (IndexedDB)
When offline, transactions are serialized into an IndexedDB store named `pending_transactions_queue`:

```json
{
  "queue_id": "local_99182312_1029",
  "created_at": "2026-11-06T12:30:00.000Z",
  "branch_id": "manila_branch",
  "cashier_id": "usr_99812",
  "payload": {
    "order_number": "MNL-OFFLINE-0042",
    "items": [
      { "product_id": "prod_102", "qty": 2, "unit_price": 450.00 }
    ],
    "total_amount": 900.00,
    "payment_method": "cash"
  },
  "sync_status": "pending_upload",
  "retry_count": 0
}
```

### 4.3 Supabase Realtime Subscriptions Configuration
To ensure stock movements in Dagupan are immediately reflected on admin counters in Manila:

```javascript
// Supabase Client Realtime Subscription Setup
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://your-project.supabase.co', 'ANON_KEY');

// Subscribe to live inventory updates for active branch
export function subscribeToBranchInventory(branchId, onStockUpdate) {
  return supabase
    .channel(`inventory_channel_${branchId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'inventory_stock',
        filter: `branch_id=eq.${branchId}`
      },
      (payload) => {
        onStockUpdate(payload);
      }
    )
    .subscribe();
}
```

---

## 5. Implementation Roadmap & Phase Milestones

```
2026 Q4 Timeline:
[ Week 1 - 3 ] Phase 1: DB Schema Migration & Multi-Branch RLS Policy Setup
[ Week 4 - 6 ] Phase 2: Inter-Branch Stock Transfer Engine & State Machine
[ Week 7 - 9 ] Phase 3: Touch Interface Refactoring & Tablet POS Optimization
[ Week 10-12 ] Phase 4: Offline PWA Queue, IndexedDB Engine & Sync Manager
[ Week 13-14 ] Phase 5: Centralized Multi-Branch Admin Dashboard & Audit Logs
[ Week 15-16 ] Phase 6: Field Testing in Dagupan & Manila, UAT, Deployment
```

### Phase 1: Database Migration & RLS Security Layer (Weeks 1–3)
* Apply `branch_id` column migrations across all historical tables.
* Write and execute Supabase Row Level Security (RLS) policies.
* Test cross-branch data isolation boundaries with automated unit tests.

### Phase 2: Inter-Branch Stock Transfer (STO) System (Weeks 4–6)
* Build the 4-stage transfer state machine UI (Request $\rightarrow$ Dispatch $\rightarrow$ Transit $\rightarrow$ Receive).
* Create variance detection screens for warehouse staff handling damaged or missing shipments.
* Implement notification alerts for incoming branch shipments.

### Phase 3: Tablet & Touch UI/UX Refinement (Weeks 7–9)
* Refactor POS layout for minimum $48 \times 48\text{px}$ touch targets across portrait and landscape tablet viewports.
* Replace standard inputs with custom touch keypads and drawer overlays.
* Integrate hardware barcode scanner inputs using direct keystroke listener buffers.

### Phase 4: Offline-First PWA & Realtime Engine (Weeks 10–12)
* Configure Service Worker caching for offline app boot capabilities.
* Build IndexedDB transactional queueing mechanism with auto-retry and backoff.
* Implement conflict resolution handlers for offline cash transactions.

### Phase 5: Master Administrative Dashboard & Audit Logging (Weeks 13–14)
* Construct aggregated multi-branch analytics view with instant location toggling.
* Implement real-time system audit log viewer for security compliance.
* Roll out "View As Branch" delegation mode for admin management.

### Phase 6: Field Testing, UAT & Live Deployment (Weeks 15–16)
* Conduct hardware testing on targeted tablet devices at Dagupan Main and Manila Branch.
* Simulate network outage scenarios during active POS checkouts.
* Final sign-off, user training, and production rollout.

---

## 6. Operational Verification & Failure Recovery Runbook

### 6.1 Pre-Flight Deployment Checklist
- [ ] Verify RLS policy enforcement: Cashier credentials must fail to select records where `branch_id != primary_branch_id`.
- [ ] Validate touch target boundaries on physical iPad ($10.2"$) and Android ($11"$) testing tablets.
- [ ] Disconnect network interface while processing POS order and verify transaction persistence to local IndexedDB.
- [ ] Re-enable network connection and verify automatic background sync to Supabase `sales_orders` table within 5 seconds.
- [ ] Initiate cross-branch STO from Dagupan to Manila; verify inventory levels lock until received.

### 6.2 Discrepancy & Sync Failure Recovery Standard Operating Procedure (SOP)
1. **Network Disruption Recovery:** If offline sync stalls due to intermittent connection, cashiers trigger manual sync via the `[Sync Now]` button in the top navigation status indicator.
2. **Stock Discrepancy Flagging:** If incoming physical stock at Manila does not match the Dagupan dispatch manifest, the receiving user selects `Flag Variance`. The system logs the delta in `stock_transfer_items.variance_reason` and alerts the Branch Manager and Super Admin immediately.
3. **Audit Log Inspection:** All manual overrides must be accompanied by an administrative PIN entry, recorded directly into `audit_logs` with the responsible manager's timestamped user identity.
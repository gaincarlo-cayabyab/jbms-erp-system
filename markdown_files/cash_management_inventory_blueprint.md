# JAPA Global Dagupan — Cash Management & Inventory System Blueprint

## Executive Summary

This blueprint outlines the structural and functional enhancements for the **JAPA Global Dagupan** Enterprise POS & ERP System. The focus of this update is twofold:
1. **Inventory Record Alignment**: Standardizing SKU numbers, product classifications, category hierarchy, and multi-tab stock tracking (ignoring pricing/value parameters to prioritize stock movement accuracy).
2. **Cash Management Architecture**: Resolving current CRUD (Create, Read, Update, Delete) restriction bottlenecks by introducing a secure, audited role-based access framework, multi-tier **Liquid Cash Containers & Vaults**, and real-time **POS Cash In / Cash Out** monitoring.

---

## 1. Standardized Inventory Record Structure

To maintain consistency across physical inventory counts and system records, the inventory module prioritizes stock movements, categorizations, and stock status tabs.

### 1.1 Core Attributes Schema
* **Product Name**: Canonical trade name of the item.
* **SKU Number**: Unique Stock Keeping Unit identifier (barcode/alphanumeric code).
* **Category Name**: Primary classification (e.g., Fasteners, Paints, Power Tools, Electrical).
* **Sub-Category / Brand**: Secondary level grouping for fast filtering.

### 1.2 Stock Location & Status Tabs Structure
The stock management interface is split into four explicit inventory tabs:

| Stock Tab | Purpose & Logic |
| :--- | :--- |
| **Available Stock ($S_{avail}$)** | Physical stock available on store shelves for immediate point-of-sale purchase. |
| **Reserved Stock ($S_{res}$)** | Items allocated to pending customer orders, layaways, or delivery queues. |
| **In-Transit Stock ($S_{trans}$)** | Stock currently being transferred from central warehouses or supplier dispatches to Dagupan branch. |
| **Quarantine / Audit Stock ($S_{audit}$)** | Items undergoing damage inspection, count discrepancy hold, or vendor return processing. |

$$\text{Total Physical Stock} = S_{avail} + S_{res} + S_{audit}$$

---

## 2. Cash Management Architecture & Vault Hierarchy

Financial control requires a strict separation of physical cash locations. Cash flows through defined channels from the cashier's till up to the primary vault and bank deposits.

```
       [ POS Front Cashier Till ]
                   │
                   │  (Safe Drop / Cash Out)
                   ▼
     [ Manager Back-Office Safe Box ]
                   │
                   │  (EOD Vault Transfer)
                   ▼
     [ JAPA Global Main Store Vault ]
                   │
                   │  (Bank Deposit Action)
                   ▼
       [ Commercial Bank Account ]
```

### 2.1 Cash Container Types

1. **POS Till / Cash Drawer (Level 1)**: Front-line drawer assigned to a specific cashier shift.
2. **Manager Safe / Petty Cash Box (Level 2)**: Back-office operational cash container for interim drawer drops, change loans, and petty branch expenses.
3. **Main Store Vault (Level 3)**: High-security central container for store reserves and daily consolidated revenues (managed exclusively by Admin/Owner).
4. **Bank In-Transit (Level 4)**: Virtual holding account tracking funds removed from the Vault awaiting bank deposit confirmation.

---

## 3. Real-Time Cash Flow Operations (Cash In / Cash Out)

### 3.1 Front Cashier Till Operations (POS Level)

Cash registers must record all cash entries and removals beyond standard sales.

* **Cash In Events**:
  * **Float In**: Opening cash float allocated at shift startup.
  * **Paid In / Change Loan**: Additional smaller currency bills added to drawer from Manager Safe.
  * **Customer Cash Payment**: Automated entry via sales checkout.

* **Cash Out Events**:
  * **Safe Drop**: Removal of excess cash when drawer exceeds pre-set cash ceiling limit ($T_{max}$).
  * **Paid Out / Petty Expense**: Minor store operational expenses authorized by manager (e.g., emergency store supplies, minor freight fees).
  * **Customer Cash Change / Refund**: Cash returned to customer.

### 3.2 Automated Cash Ceiling Alert Logic
To prevent loss or robbery risks, the POS triggers an enforced **Safe Drop Prompt** whenever drawer cash exceeds the threshold limit:

$$\text{Current Drawer Cash} = \text{Float} + \sum \text{Cash In} - \sum \text{Cash Out}$$

$$\text{If } \text{Current Drawer Cash} \ge T_{max} \implies \text{Trigger Mandatory Safe Drop Alert}$$

*(Recommended Default Threshold $T_{max} = \text{PHP } 15,000.00$ per drawer)*.

---

## 4. Role-Based Access Control (RBAC) & Visibility Matrix

Why users previously experienced issues with Add, Edit, and Delete:
> Direct editing or deleting of financial logs compromises accounting integrity and compliance. Instead of simple "deletion," cash records require **Immutable Audits**, where errors are handled via **Manager/Admin Approved Reversals & Adjustments**.

### 4.1 Granular Action & Visibility Matrix

| Feature / Action | Frontline Cashier | Store Manager | System Admin |
| :--- | :---: | :---: | :---: |
| **View Own Register Till Balance** | ✅ (Blind/X-Read) | ✅ Full | ✅ Full |
| **View Other Cashiers' Drawer Balances** | ❌ Blocked | ✅ Full | ✅ Full |
| **View Manager Safe Balance** | ❌ Blocked | ✅ Full | ✅ Full |
| **View Main Store Vault Balance** | ❌ Blocked | ❌ Blocked | ✅ Full |
| **Perform Paid In / Cash In** | ✅ Logged | ✅ Authorized | ✅ Full |
| **Perform Paid Out / Safe Drop** | ✅ Initiated | ✅ Approved | ✅ Full |
| **Edit/Void Pending Cash Transactions** | ❌ Blocked | ✅ Reversal Request | ✅ Direct Edit/Void |
| **Add / Create New Cash Containers** | ❌ Blocked | ❌ Blocked | ✅ Full Control |
| **Delete / Archive Cash Containers** | ❌ Blocked | ❌ Blocked | ✅ Full Control |
| **Perform EOD Reconciliation & Z-Read** | ❌ Initiates Only | ✅ Approves & Signs | ✅ Override/Audit |

---

## 5. UI/UX Interface Modules & Views

### 5.1 Front Cashier View (POS Cash Modal)
* **Design Focus**: High touch targets, simple, distraction-free interface.
* **Available Buttons**:
  * `[ Add Float / Cash In ]` $\rightarrow$ Prompts for Amount & Reason (e.g., "Change Loan").
  * `[ Safe Drop / Cash Out ]` $\rightarrow$ Prompts for Dropped Amount, prints verification slip.
  * `[ Current Drawer Summary ]` $\rightarrow$ Displays total Cash Sales and Net Cash in Register.
  * `[ Request Shift Close (Blind Count) ]` $\rightarrow$ Inputs counted currency notes; sends figures to Manager interface without displaying system expected balance.

### 5.2 Manager Workspace (Branch Control)
* **Design Focus**: Monitoring and approval drawer.
* **Key Components**:
  * **Live Drawer Monitor**: Visual grid of all active registers in Dagupan store showing current cash levels.
  * **Pending Safe Drop Approvals**: Accepts incoming drops from cashiers and automatically credits the **Manager Safe Box**.
  * **Shift Variance Ledger**: Calculates count variances:
    $$\Delta = \text{Actual Cash Count} - \text{Expected Drawer Balance}$$
  * **Reversal & Override Panel**: Allows voiding incorrect Cash In/Out entries with mandatory reason logs.

### 5.3 Admin Workspace (Liquid Cash & Vault Dashboard)
* **Design Focus**: Full structural configuration & financial governance.
* **Key Components**:
  * **Vault & Container Configuration**:
    * Button: `+ Create Liquid Cash Container` (Select Type: Vault, Register Drawer, Manager Safe, Bank Account).
    * Set drawer rules ($T_{max}$ alerts, float defaults).
  * **Container Cash Movement History**: Full searchable ledger across all containers with filter tags (`Date`, `Shift`, `Cashier`, `Manager Approval`).
  * **Hard Reset / Audit Ledger Control**: Tools to resolve structural imbalances, adjust initial float balances, and archive unused drawers.

---

## 6. Audit & Anti-Fraud Security Protocols

1. **Dual-Key Verification for Safe Drops**:
   When a Cashier performs a Safe Drop, the POS generates a dual-slip or digital request. The Manager must confirm receipt in their dashboard before the funds transition from `POS Till` status to `Manager Safe` status.
2. **Immutable Audit Trail**:
   No Cash In or Cash Out transaction is ever hard-deleted from the database. Deletions are processed as marked `REVERSED` entries, referencing the original Transaction ID, timestamp, and authorizing Manager ID.
3. **Blind Reconciliation Rule**:
   During end-of-shift closing, cashiers enter physical counts note-by-note without viewing the expected system balance. This prevents tally manipulation to cover missing funds.

---

## 7. Implementation Roadmap & Next Steps

1. **Database Schema Update**: Deploy tables for `CashContainers`, `CashTransactions`, `ShiftReconciliations`, and `AuditLogs`.
2. **Inventory Tab Filtering**: Refactor current inventory lists to toggle cleanly between `Available`, `Reserved`, `In-Transit`, and `Quarantine` stock views using SKU and Category indexing.
3. **RBAC Middleware Integration**: Update backend permission guards to unlock container management for Admins and approval workflows for Managers.
4. **POS Interface Rollout**: Update cashier terminal screens with simplified Cash In, Safe Drop, and Shift Close action prompts.
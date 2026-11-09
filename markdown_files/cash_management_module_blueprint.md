# JBMS ERP System — Cash Management Module Specification

## 1. Executive Summary & Architecture Audit

The `jbms-erp-system` operates across operational departments including Point of Sale (POS), Sales & Invoicing, Purchasing & Inventory, Payroll, Production, and General Financials. However, the system currently lacks a centralized **Cash Management Module** to track real-time liquidity, cash inflows (money in), cash outflows (money out), and multi-branch cash register reconciliations.

This specification details the structural blueprint, relational database schema, API integration contracts, and module hooks required to embed a robust **Cash Management System** into the Next.js App Router (`app/cash-management/`).

---

## 2. System Gap Analysis & Operational Matrix

The existing routes handle operational events but do not directly manage real-time liquid balance movements. The table below outlines how each module maps to cash flows and the exact gap being addressed:

| Existing Route | Operational Functionality | Cash Flow Role | Cash Management Gap Solved |
| :--- | :--- | :--- | :--- |
| `app/pos/page.tsx` | Point of Sale counter sales | **Cash Inflow** | Tracks register shift openings, closes, and physical count vs. system expected variance. |
| `app/sales/page.tsx` | Sales orders & invoicing | **Cash Inflow (A/R)** | Binds customer payment receipts directly to target bank/vault accounts rather than unallocated revenue. |
| `app/customers/page.tsx` | Customer management | Customer balances | Generates linked Cash Receipt Vouchers (CRV) for partial or full settlement of customer credit. |
| `app/payroll/page.tsx` | Employee pay runs | **Cash Outflow** | Automatically generates disbursement records that reduce balances from designated payroll bank accounts. |
| `app/inventory/page.tsx` | Stock purchasing & supplier orders | **Cash Outflow (A/P)** | Requires formal Cash Disbursement Vouchers (CDV) prior to marking supplier invoices as settled. |
| `app/production/page.tsx` | Manufacturing & job orders | Direct expenses | Enables tagging petty cash or direct bank payments to specific production job cost IDs. |
| `app/financials/page.tsx` | General ledger & P&L | Financial accounting | Provides direct liquidity visibility and real-time cash position independent of accrual ledger posting. |
| `app/transfers/page.tsx` | Inter-branch inventory moves | Asset transfer | Adds support for cash and petty cash fund transfers between Dagupan Main and Manila Branch. |

---

## 3. Cash Management Architecture Blueprint

The Cash Management Module serves as the single source of truth for liquid assets across all physical and digital touchpoints.

```
                                  ┌─────────────────────────────────────────┐
                                  │       CASH MANAGEMENT ENGINE            │
                                  │      (app/cash-management/)             │
                                  └────────────────────┬────────────────────┘
                                                       │
         ┌─────────────────────────────────────────────┼─────────────────────────────────────────────┐
         │                                             │                                             │
┌────────┴─────────────────┐             ┌─────────────┴────────────┐             ┌──────────────────┴─────────────────┐
│     MONEY INFLOWS        │             │      MONEY OUTFLOWS      │             │    LIQUIDITY REGISTRY & VAULTS     │
├──────────────────────────┤             ├──────────────────────────┤             ├────────────────────────────────────┤
│ • POS Cash/Digital Sales │             │ • Vendor A/P Settlements │             │ • Main Vault (Dagupan Main)        │
│ • A/R Customer Invoices  │             │ • Payroll Disbursements  │             │ • Main Vault (Manila Branch)       │
│ • Bank Interest/Deposits │             │ • Petty Cash Expense     │             │ • POS Cash Drawers (Per Shift)     │
│ • Inter-Branch Transfers │             │ • Operational OpEx       │             │ • Bank Accounts (Checking/Savings) │
│ • Direct Capital Inflow  │             │ • Inter-Branch Outflow   │             │ • Digital Wallets (GCash/PayMaya)  │
└──────────────────────────┘             └──────────────────────────┘             └────────────────────────────────────┘
```

### Key Pillars

1. **Inflow Engine (Money In):**
   * Captures counter sales, customer invoice collections, bank deposits, and inter-branch incoming funds.
   * Enforces mandatory tagging of payment method (Cash, Check, Bank Transfer, Digital Wallet).

2. **Outflow Engine (Money Out):**
   * Handles payment vouchers for vendor invoices, employee payroll runs, petty cash disbursements, and operational overheads (utilities, fuel, maintenance).
   * Supports approval workflows for cash disbursements exceeding configurable threshold amounts.

3. **Multi-Branch Cash Registry:**
   * Full data segregation between **Dagupan Main Branch** (`DAGUPAN_MAIN`) and **Manila Branch** (`MANILA_BRANCH`).
   * Headquarters access mode providing unified, consolidated liquidity oversight.

4. **Reconciliation & Drawer Shift Management:**
   * End-of-day register closing balancing expected cash against physical cash count.
   * Automated variance calculation:

$$\text{Variance} = \text{Actual Cash Count} - \text{System Expected Balance}$$

---

## 4. Supabase Database Schema (PostgreSQL)

Execute the following SQL script in your Supabase SQL Editor to establish the relational tables, automatic balance trigger functions, constraints, and Row Level Security (RLS) policies.

```sql
-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CASH ACCOUNTS (Vaults, Banks, POS Drawers, Digital Wallets)
CREATE TABLE cash_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id VARCHAR(50) NOT NULL, -- e.g., 'DAGUPAN_MAIN', 'MANILA_BRANCH'
    account_name VARCHAR(100) NOT NULL,
    account_type VARCHAR(30) NOT NULL CHECK (
        account_type IN ('cash_drawer', 'vault', 'bank_checking', 'bank_savings', 'petty_cash', 'ewallet')
    ),
    account_number VARCHAR(50), -- Bank account number, GCash number, or null for physical cash
    currency VARCHAR(10) DEFAULT 'PHP',
    current_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CASH CATEGORIES
CREATE TABLE cash_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name VARCHAR(100) NOT NULL,
    flow_type VARCHAR(10) NOT NULL CHECK (flow_type IN ('inflow', 'outflow')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed Essential Categories
INSERT INTO cash_categories (category_name, flow_type, description) VALUES
('POS Retail Sales', 'inflow', 'Daily counter sales from retail registers'),
('Accounts Receivable Settlement', 'inflow', 'Payments collected against outstanding customer invoices'),
('Inter-Branch Transfer In', 'inflow', 'Liquidity received from another branch'),
('Miscellaneous Inflow', 'inflow', 'Scrap sales, refunds, or capital deposits'),
('Vendor/Supplier Settlement', 'outflow', 'Disbursements paid against purchase orders'),
('Payroll Payout', 'outflow', 'Salaries, wages, and employee allowances'),
('Petty Cash Expenditure', 'outflow', 'Daily operational micro-expenses'),
('Utilities & OpEx', 'outflow', 'Electricity, water, internet, rent, and logistics'),
('Inter-Branch Transfer Out', 'outflow', 'Liquidity transferred to another branch');

-- 3. MASTER CASH TRANSACTIONS TABLE
CREATE TABLE cash_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_no VARCHAR(50) NOT NULL UNIQUE,
    branch_id VARCHAR(50) NOT NULL,
    cash_account_id UUID NOT NULL REFERENCES cash_accounts(id) ON DELETE RESTRICT,
    category_id UUID NOT NULL REFERENCES cash_categories(id),
    flow_type VARCHAR(10) NOT NULL CHECK (flow_type IN ('inflow', 'outflow')),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(30) NOT NULL CHECK (
        payment_method IN ('cash', 'check', 'bank_transfer', 'ewallet')
    ),
    reference_no VARCHAR(100), -- Invoice #, PO #, Payrun ID, Check #
    source_module VARCHAR(30) NOT NULL CHECK (
        source_module IN ('pos', 'sales', 'procurement', 'payroll', 'opex', 'transfer', 'manual')
    ),
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
    payee_or_payer VARCHAR(150),
    notes TEXT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. REGISTER SHIFT RECONCILIATION LOG
CREATE TABLE cash_reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id VARCHAR(50) NOT NULL,
    cash_account_id UUID NOT NULL REFERENCES cash_accounts(id),
    shift_opened_at TIMESTAMP WITH TIME ZONE NOT NULL,
    shift_closed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    opening_balance DECIMAL(15, 2) NOT NULL,
    total_inflows DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    total_outflows DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    expected_amount DECIMAL(15, 2) NOT NULL,
    actual_amount DECIMAL(15, 2) NOT NULL,
    variance DECIMAL(15, 2) GENERATED ALWAYS AS (actual_amount - expected_amount) STORED,
    variance_reason TEXT,
    reconciled_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. INTER-ACCOUNT CASH TRANSFERS
CREATE TABLE cash_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_no VARCHAR(50) NOT NULL UNIQUE,
    from_account_id UUID NOT NULL REFERENCES cash_accounts(id),
    to_account_id UUID NOT NULL REFERENCES cash_accounts(id),
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    transfer_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    initiated_by UUID NOT NULL,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'rejected')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AUTOMATIC BALANCE UPDATER TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION update_cash_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.status = 'completed') THEN
            IF (NEW.flow_type = 'inflow') THEN
                UPDATE cash_accounts 
                SET current_balance = current_balance + NEW.amount,
                    updated_at = NOW()
                WHERE id = NEW.cash_account_id;
            ELSIF (NEW.flow_type = 'outflow') THEN
                UPDATE cash_accounts 
                SET current_balance = current_balance - NEW.amount,
                    updated_at = NOW()
                WHERE id = NEW.cash_account_id;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- TRIGGER BINDING
CREATE TRIGGER trg_update_cash_balance
AFTER INSERT ON cash_transactions
FOR EACH ROW
EXECUTE FUNCTION update_cash_account_balance();

-- INDEXES FOR PERFORMANCE
CREATE INDEX idx_cash_transactions_branch ON cash_transactions(branch_id);
CREATE INDEX idx_cash_transactions_account ON cash_transactions(cash_account_id);
CREATE INDEX idx_cash_transactions_date ON cash_transactions(created_at);
CREATE INDEX idx_cash_accounts_branch ON cash_accounts(branch_id);
```

---

## 5. Next.js Server Actions & API Layer (`app/actions/cash.ts`)

Below is the implementation logic for managing cash transactions, transfers, and drawer reconciliations:

```typescript
'use me' // Next.js Server Action file pattern

import { createClient } from '@/utils/supabase/server';

export interface CreateTransactionPayload {
  branchId: string;
  cashAccountId: string;
  categoryId: string;
  flowType: 'inflow' | 'outflow';
  amount: number;
  paymentMethod: 'cash' | 'check' | 'bank_transfer' | 'ewallet';
  referenceNo?: string;
  sourceModule: 'pos' | 'sales' | 'procurement' | 'payroll' | 'opex' | 'transfer' | 'manual';
  payeeOrPayer?: string;
  notes?: string;
  userId: string;
}

/**
 * Executes a single cash inflow or outflow transaction
 */
export async function recordCashTransaction(payload: CreateTransactionPayload) {
  const supabase = createClient();
  
  // Generate transaction number
  const txPrefix = payload.flowType === 'inflow' ? 'CRV' : 'CDV';
  const transactionNo = `${txPrefix}-${Date.now()}`;

  const { data, error } = await supabase.from('cash_transactions').insert([{
    transaction_no: transactionNo,
    branch_id: payload.branchId,
    cash_account_id: payload.cashAccountId,
    category_id: payload.categoryId,
    flow_type: payload.flowType,
    amount: payload.amount,
    payment_method: payload.paymentMethod,
    reference_no: payload.referenceNo || null,
    source_module: payload.sourceModule,
    payee_or_payer: payload.payeeOrPayer || null,
    notes: payload.notes || null,
    created_by: payload.userId,
    status: 'completed'
  }]).select().single();

  if (error) {
    throw new Error(`Failed to record cash transaction: ${error.message}`);
  }

  return data;
}

/**
 * Transfers funds between accounts (e.g., Vault to Drawer, Branch to Branch)
 */
export async function executeCashTransfer(params: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  initiatedBy: string;
  notes?: string;
}) {
  const supabase = createClient();
  const transferNo = `TRF-${Date.now()}`;

  // 1. Insert Transfer Record
  const { data: transfer, error: trfError } = await supabase.from('cash_transfers').insert([{
    transfer_no: transferNo,
    from_account_id: params.fromAccountId,
    to_account_id: params.toAccountId,
    amount: params.amount,
    initiated_by: params.initiatedBy,
    notes: params.notes,
    status: 'completed'
  }]).select().single();

  if (trfError) throw new Error(trfError.message);

  // Fetch accounts to derive branch IDs
  const { data: accounts } = await supabase
    .from('cash_accounts')
    .select('id, branch_id, account_name')
    .in('id', [params.fromAccountId, params.toAccountId]);

  const fromAcc = accounts?.find(a => a.id === params.fromAccountId);
  const toAcc = accounts?.find(a => a.id === params.toAccountId);

  // Fetch transfer categories
  const { data: categories } = await supabase
    .from('cash_categories')
    .select('id, category_name')
    .in('category_name', ['Inter-Branch Transfer Out', 'Inter-Branch Transfer In']);

  const categoryOut = categories?.find(c => c.category_name === 'Inter-Branch Transfer Out');
  const categoryIn = categories?.find(c => c.category_name === 'Inter-Branch Transfer In');

  // 2. Record Outflow from source account
  await recordCashTransaction({
    branchId: fromAcc?.branch_id || 'DAGUPAN_MAIN',
    cashAccountId: params.fromAccountId,
    categoryId: categoryOut?.id!,
    flowType: 'outflow',
    amount: params.amount,
    paymentMethod: 'cash',
    referenceNo: transferNo,
    sourceModule: 'transfer',
    payeeOrPayer: `Transfer to ${toAcc?.account_name}`,
    notes: params.notes,
    userId: params.initiatedBy
  });

  // 3. Record Inflow to target account
  await recordCashTransaction({
    branchId: toAcc?.branch_id || 'DAGUPAN_MAIN',
    cashAccountId: params.toAccountId,
    categoryId: categoryIn?.id!,
    flowType: 'inflow',
    amount: params.amount,
    paymentMethod: 'cash',
    referenceNo: transferNo,
    sourceModule: 'transfer',
    payeeOrPayer: `Transfer from ${fromAcc?.account_name}`,
    notes: params.notes,
    userId: params.initiatedBy
  });

  return transfer;
}

/**
 * Reconciles drawer balance at end of shift
 */
export async function closeRegisterShift(params: {
  branchId: string;
  cashAccountId: string;
  shiftOpenedAt: string;
  openingBalance: number;
  totalInflows: number;
  totalOutflows: number;
  actualAmount: number;
  varianceReason?: string;
  userId: string;
}) {
  const supabase = createClient();
  
  const expectedAmount = params.openingBalance + params.totalInflows - params.totalOutflows;

  const { data, error } = await supabase.from('cash_reconciliations').insert([{
    branch_id: params.branchId,
    cash_account_id: params.cashAccountId,
    shift_opened_at: params.shiftOpenedAt,
    opening_balance: params.openingBalance,
    total_inflows: params.totalInflows,
    total_outflows: params.totalOutflows,
    expected_amount: expectedAmount,
    actual_amount: params.actualAmount,
    variance_reason: params.varianceReason || null,
    reconciled_by: params.userId
  }]).select().single();

  if (error) throw new Error(error.message);
  return data;
}
```

---

## 6. UI & Dashboard Component Design (`app/cash-management/page.tsx`)

The Cash Management Interface provides key dashboard components:

1. **Top Liquidity Banner:**
   * **Total Cash Balance Across All Accounts**
   * **Daily Cash Inflow Total**
   * **Daily Cash Outflow Total**
   * **Net Daily Cash Flow:**

$$\text{Net Cash Flow} = \text{Total Cash Inflow} - \text{Total Cash Outflow}$$

2. **Branch Balance Selector:** Toggle view between `Dagupan Main`, `Manila Branch`, or `Consolidated View`.
3. **Accounts Grid:** Visual cards for each cash container showing account name, account type icon, branch badge, and current balance.
4. **Transaction Journal:** Tabbed datatable displaying incoming receipts and outgoing disbursements with filters for category, date, and source module.
5. **Quick Action Drawer:** Express buttons for:
   * **+ Cash Inflow (Receipt)**
   * **- Cash Outflow (Disbursement)**
   * **⇄ Account Transfer**
   * **⚖ End of Shift Balancing**

---

## 7. Integration Matrix Across Operational Modules

```
                    ┌──────────────────────────────────────────────┐
                    │      CASH MANAGEMENT CENTRAL ENGINE          │
                    └──────────────────────┬───────────────────────┘
                                           │
         ┌──────────────────┬──────────────┴───────┬──────────────────┐
         │                  │                      │                  │
┌────────┴────────┐ ┌───────┴────────┐    ┌────────┴────────┐ ┌────────┴────────┐
│  app/pos/       │ │ app/sales/     │    │ app/inventory/  │ │ app/payroll/    │
│  (Point of Sale)│ │ (A/R Invoicing)│    │ (Procurement)   │ │ (Salaries/Wages)│
└────────┬────────┘ └───────┬────────┘    └────────┬────────┘ └────────┬────────┘
         │                  │                      │                  │
         │                  │                      │                  │
         ▼                  ▼                      ▼                  ▼
┌─────────────────┐ ┌────────────────┐    ┌────────────────┐ ┌────────────────┐
│ Triggers Cash   │ │ Hooks Invoice  │    │ Hooks Supplier │ │ Hooks Pay Run  │
│ Receipt on POS  │ │ Payment to     │    │ Payment to     │ │ Approval to    │
│ Checkout        │ │ Cash Account   │    │ Disbursement   │ │ Bank Account   │
└─────────────────┘ └────────────────┘    └────────────────┘ └────────────────┘
```

### A. Point of Sale (`app/pos/page.tsx`)
* **Checkout Handler Hook:** Upon completing a counter payment (Cash/GCash/Card), invoke `recordCashTransaction`:
  ```typescript
  await recordCashTransaction({
    branchId: currentShift.branchId,
    cashAccountId: currentShift.posCashAccountId,
    categoryId: posSalesCategoryId,
    flowType: 'inflow',
    amount: cart.grandTotal,
    paymentMethod: selectedPaymentMethod,
    referenceNo: posReceiptNumber,
    sourceModule: 'pos',
    payeeOrPayer: 'Walk-in Customer',
    userId: currentUser.id
  });
  ```

### B. Sales & Accounts Receivable (`app/sales/page.tsx`)
* **Invoice Receipt Hook:** When collecting payment against an outstanding invoice:
  ```typescript
  await recordCashTransaction({
    branchId: invoice.branchId,
    cashAccountId: selectedDepositAccount,
    categoryId: arCollectionCategoryId,
    flowType: 'inflow',
    amount: paymentAmount,
    paymentMethod: paymentMethod,
    referenceNo: invoice.number,
    sourceModule: 'sales',
    payeeOrPayer: customer.name,
    userId: currentUser.id
  });
  ```

### C. Procurement & Accounts Payable (`app/inventory/page.tsx`)
* **Purchase Order Payment Hook:** When issuing payment for a purchase order or inventory delivery:
  ```typescript
  await recordCashTransaction({
    branchId: purchaseOrder.branchId,
    cashAccountId: selectedDisbursementAccount,
    categoryId: vendorSettlementCategoryId,
    flowType: 'outflow',
    amount: payoutAmount,
    paymentMethod: paymentMethod,
    referenceNo: purchaseOrder.poNumber,
    sourceModule: 'procurement',
    payeeOrPayer: vendor.companyName,
    userId: currentUser.id
  });
  ```

### D. Payroll Processing (`app/payroll/page.tsx`)
* **Pay Run Disbursement Hook:** Upon final approval and release of a salary batch:
  ```typescript
  await recordCashTransaction({
    branchId: payrun.branchId,
    cashAccountId: corporateBankAccountId,
    categoryId: payrollCategoryId,
    flowType: 'outflow',
    amount: payrun.netPayoutTotal,
    paymentMethod: 'bank_transfer',
    referenceNo: `PAYRUN-${payrun.periodEnd}`,
    sourceModule: 'payroll',
    payeeOrPayer: `Payroll Batch (${payrun.employeeCount} Employees)`,
    userId: currentUser.id
  });
  ```

---

## 8. Implementation Roadmap & Deployment Checklist

- [x] **Phase 1: Database Setup**
  - Execute SQL migration to create `cash_accounts`, `cash_categories`, `cash_transactions`, `cash_reconciliations`, and `cash_transfers`.
  - Verify trigger `trg_update_cash_balance` automatically recalculates balances upon transaction insertion.

- [x] **Phase 2: Core Server Actions**
  - Implement `recordCashTransaction`, `executeCashTransfer`, and `closeRegisterShift` in `app/actions/cash.ts`.

- [x] **Phase 3: Module UI Development**
  - Build main dashboard page at `app/cash-management/page.tsx`.
  - Construct transaction log datatable, account registry grid, and quick action modals.

- [x] **Phase 4: Operational Module Hooks Integration**
  - Connect POS checkout handler to post inflow transactions.
  - Connect Procurement PO payment modal to post outflow transactions.
  - Connect Payroll approval flow to trigger bank account deductions.

- [x] **Phase 5: Testing & Verification**
  - Verify multi-branch data isolation between Dagupan Main and Manila Branch.
  - Audit daily cash reconciliation register to ensure overage/shortage calculation accuracy.
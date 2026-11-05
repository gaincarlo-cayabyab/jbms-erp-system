# JAPA Core Enterprise Resource Planning (ERP) & Point of Sale (POS) System Specification

**Document Version:** 2.0.0  
**Target Hardware:** Desktop PC, Laptop, Touchscreen POS Terminals, Mobile Tablets (iOS/Android)  
**Primary Deployment Branches:**  
1. `JAPA Dagupan (Main Branch)`  
2. `JAPA Manila`  

---

## 1. Executive Summary & System Vision

The **JAPA Core ERP & POS System** is an all-in-one commercial software suite designed to unify inventory tracking, multi-branch distribution, sales management, financial auditing, and fast-paced cashier checkout operations. 

Recognizing that users operate across desktop computers, tablets, and dedicated touch POS hardware, the platform prioritizes a **touch-first, low-friction UX**. The interface automatically scales to full-screen mode on cashier terminals, utilizes oversized touch targets ($64 \text{px} \times 64 \text{px}$ minimum interactive areas), and streamlines common workflows—such as adding items, overriding prices, applying discounts, switching branches, and completing checkout transactions.

---

## 2. Multi-Branch Operations Architecture

The system natively supports multi-location operations with central administrative oversight.

```
                         ┌─────────────────────────────────┐
                         │   Central Cloud / Data Sync Hub │
                         └────────────────┬────────────────┘
                                          │
                 ┌────────────────────────┴────────────────────────┐
                 │                                                 │
   ┌─────────────▼─────────────┐                     ┌─────────────▼─────────────┐
   │ JAPA Dagupan (Main Branch)│                     │        JAPA Manila        │
   ├───────────────────────────┤                     ├───────────────────────────┤
   │ - Main Warehouse Inventory│                     │ - Regional Warehouse      │
   │ - Primary Cashier POS 01  │                     │ - Manila Cashier POS 01   │
   │ - Primary Cashier POS 02  │                     │ - Manila Mobile POS       │
   └───────────────────────────┘                     └───────────────────────────┘
```

### 2.1 Branch Rules & Context Switching
* **Default Branch Designation:**  
  * `JAPA Dagupan (Main Branch)` serves as the primary master inventory hub, head office accounting unit, and central fulfillment controller.
  * `JAPA Manila` operates as a dedicated regional sales and inventory node.
* **Header Branch Selector:** A prominent, touch-friendly dropdown in the top navigation bar allows managers to switch views between branches or monitor consolidated multi-branch metrics.
* **Isolated Stock Levels:** Product inventory counts are tracked independently per branch. Stock transfers between Dagupan and Manila trigger inter-branch stock transport requests ($STR$) with automated dispatch/receipt auditing.

---

## 3. Adaptive UI/UX & Kiosk / POS Mode

### 3.1 Automatic Fullscreen Execution
To provide an immersive, distraction-free environment for cashiers and prevent accidental navigation away from the terminal, the POS module features automatic fullscreen triggering.

* **Fullscreen Trigger Logic:**
  * When opening the Cashier / POS view, the app requests Browser Fullscreen via the `HTML5 Fullscreen API` (`document.documentElement.requestFullscreen()`).
  * A dedicated **"Toggle Fullscreen"** floating action button is permanently accessible in the upper right toolbar for manual control.
  * **Kiosk Lock Mode:** An administrator setting allows locking the window into kiosk mode on native desktop wrappers (Electron / Tauri / PWA).

### 3.2 Touch-Optimized Layout Strategy
All visual elements strictly follow ergonomics designed for capacitive touchscreens and mouse input alike:

| Control Type | Minimum Touch Area | Visual Feedback | Ergonomic Purpose |
| :--- | :--- | :--- | :--- |
| **Primary POS Action Buttons** | $64 \text{px} \times 64 \text{px}$ | Instant tactile press effect + sound queue | Fast checkout execution without missed taps |
| **Product Grid Tiles** | $120 \text{px} \times 120 \text{px}$ | High-contrast card with stock badge | Quick visual item recognition |
| **Cart Quantity Controls** | $48 \text{px} \times 48 \text{px}$ | Stepper `[ + ]` and `[ - ]` soft touch | Easy modification of line items |
| **Table Grid Rows** | $56 \text{px}$ Row Height | Alternating background hues | Prevents mis-clicks during data browsing |

---

## 4. Cashier & Point of Sale (POS) Module

### 4.1 Interface Layout Overview
The Cashier screen is split into three functional zones designed for zero-latency customer processing:

1. **Left Panel: Dynamic Product Catalog & Quick Keys**
   * Instant search bar supporting real-time text query and USB/Bluetooth barcode scanning.
   * Categorized tab filters (e.g., *Fast Moving*, *Electronics*, *Hardware*, *Promos*).
   * Visual product tiles displaying item image, SKU, unit price, and real-time branch stock level.

2. **Center Panel: Active Order Cart & Line Item Editor**
   * Real-time item listing showing Item Name, SKU, Unit Price, Quantity, Line Subtotal, and applied Discounts.
   * Quick-action buttons per row: `[ + ]`, `[ - ]`, `[ Edit Price ]`, `[ Apply Line Discount ]`, `[ Trash / Remove ]`.
   * Drag-to-delete gesture support for tablet interfaces.

3. **Right Panel: Order Summary & Checkout Trigger**
   * Clear running calculation:
     $$\text{Subtotal} = \sum (\text{Quantity} \times \text{Unit Price})$$
     $$\text{Total Discount} = D_{\text{item}} + D_{\text{cart}} + D_{\text{special}}$$
     $$\text{Tax (12\% VAT)} = \text{Taxable Amount} \times 0.12$$
     $$\text{Grand Total} = \text{Subtotal} - \text{Total Discount} + \text{Tax}$$
   * Big-button payment options: `CASH`, `GCASH / E-WALLET`, `CREDIT / DEBIT CARD`, `BANK TRANSFER`.

---

## 5. Discount Engine & Special Pricing Rules

The system includes a flexible discount module accommodating automated and manual price adjustments.

```
                          ┌────────────────────────────────┐
                          │     Select Discount Type       │
                          └───────────────┬────────────────┘
                                          │
        ┌─────────────────────────────────┼─────────────────────────────────┐
        │                                 │                                 │
┌───────▼────────┐               ┌────────▼────────┐               ┌────────▼────────┐
│ Percentage (%) │               │  Fixed Cash ($) │               │ Special / Gov   │
│ e.g., 10%, 20% │               │ e.g., ₱50, ₱100 │               │ Senior/PWD 20%  │
└───────┬────────┘               └────────┬────────┘               └────────┬────────┘
        │                                 │                                 │
        └─────────────────────────────────┼─────────────────────────────────┘
                                          │
                          ┌───────────────▼────────────────┐
                          │ Requires Manager PIN Override? │
                          │ (If exceeding max limit threshold)│
                          └────────────────────────────────┘
```

### 5.1 Discount Classification
1. **Percentage Discounts ($d_{\%}$):**
   $$D_{\text{amount}} = \text{Subtotal} \times \left( \frac{d_{\%}}{100} \right)$$
2. **Fixed Amount Discounts ($D_{\text{fixed}}$):**
   $$D_{\text{amount}} = \min(D_{\text{fixed}}, \text{Subtotal})$$
3. **Government Standard Discounts (Senior Citizen / PWD):**
   * Automatically deducts 12% VAT exemption prior to applying the standard 20% discount rate on qualifying goods.
4. **Custom Manager Override:**
   * Allows cashiers to enter arbitrary discount amounts, protected by a manager authorization passcode prompt.

---

## 6. Checkout Workflow, Loading Animations & Receipt/Invoice Engine

### 6.1 Transaction Processing Workflow
```
[ Click Checkout ] ──► [ Select Payment ] ──► [ Play Video Animation ] ──► [ Display Digital Receipt Modal ] ──► [ Download Receipt Image / PDF ]
```

1. **Step 1: Payment Input & Confirmation**
   * Cashier enters amount tendered; system instantly computes change due:
     $$\text{Change} = \text{Amount Tendered} - \text{Grand Total}$$

2. **Step 2: Video Asset Transition Overlay**
   * Upon clicking **"Complete Sale"**, the interface renders a high-performance modal overlay executing the video loading asset located at:
     `assets/video/loading.mp4` (or `assets/video/processing.webm`).
   * The animation runs smoothly during backend transaction commit, inventory deduction, and receipt canvas compilation.

3. **Step 3: Digital Receipt & Invoice Transition Modal**
   * Once processing finishes, a high-contrast receipt modal slides into view showing a live visual replica of the transaction receipt and official invoice.
   * **No Physical Printer Dependency:** Since physical thermal printing is disabled, the screen displays interactive options:
     * **`[ Download Receipt Image (.PNG) ]`** — Canvas-rendered image capture.
     * **`[ Download Invoice (.PDF) ]`** — Vector document output suitable for digital mailing or archiving.
     * **`[ Send via Email / SMS ]`** — Direct digital receipt delivery.
     * **`[ Start New Sale ]`** — Instantly clears cart and returns cashier to POS ready state.

### 6.2 Digital Receipt Image Render Template

```
=================================================
             JAPA GLOBAL DIGITAL               
          JAPA Dagupan (Main Branch)               
   08 Perez Street, Dagupan City, Pangasinan    
      Tel: (075) 555-0199 / 0917-000-0000    
=================================================
Invoice No: INV-20261105-0042
Date/Time : 2026-11-05 14:27:00
Cashier   : JAPA Pearly  (POS-01)
Branch    : JAPA Dagupan (Main Branch)
-------------------------------------------------
ITEM                          QTY   PRICE   TOTAL
-------------------------------------------------
Industrial Power Drill       1   4,500   4,500.00
Heavy Duty Screwdriver Set   2     450     900.00
-------------------------------------------------
SUBTOTAL                                 5,400.00
DISCOUNT (Promo 10%)                      -540.00
12% VAT INCLUDED                           520.71
-------------------------------------------------
GRAND TOTAL                             ₱4,860.00
-------------------------------------------------
TENDERED (CASH)                         ₱5,000.00
CHANGE DUE                                ₱140.00
=================================================
     Thank you for shopping at JAPA Core!        
     This serves as an Official Receipt       
=================================================
```

---

## 7. Data Editing, Viewing, and Customization Ergonomics

To ensure management tasks (adding items, editing prices, viewing sales history, customizing categories) are seamless on all devices:

### 7.1 Unified Action Bar (CRUD Standard)
* **High-Visibility Action Buttons:** Every module header incorporates standardized color-coded touch triggers:
  * `[ + Add New Record ]` (Primary Green)
  * `[ 🖊️ Quick Batch Edit ]` (Secondary Blue)
  * `[ 🗑️ Delete Selected ]` (Danger Red, with double confirmation modal)
  * `[ 👁️ Toggle Detailed View ]` (Neutral Dark)
* **Inline Table Editing:** Users can tap/click directly on inventory quantities, selling prices, or item descriptions in table views to open inline touch editors without navigating away from the page.
* **Customizable Dashboard Layout:** Drag-and-drop tiles allowing operators to arrange high-priority widgets (e.g., *Today's Dagupan Sales*, *Manila Low Stock Alerts*, *Fast Moving Products*).

---

## 8. Technical Implementation & Asset Guidelines

### 8.1 Video Asset Path Structure
```
project-root/
│
├── assets/
│   ├── video/
│   │   ├── transaction_loading.mp4   # Primary payment processing video loader
│   │   ├── sync_anim.webm            # Offline-to-online sync loader
│   │   └── success_checkmark.mp4     # Sale success completion animation
│   │
│   ├── images/
│   │   ├── logo_dagupan.png          # Dagupan branch receipt branding
│   │   └── logo_manila.png           # Manila branch receipt branding
```

### 8.2 Client-Side Image Download Handler (HTML5 Canvas Engine)
```javascript
// Function executing digital receipt image rendering and direct download
function generateAndDownloadReceipt(transactionData) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas dimensions suitable for receipt image output
    canvas.width = 600;
    canvas.height = 900;
    
    // Render receipt styling & text using transaction data
    renderReceiptToCanvas(ctx, transactionData);
    
    // Trigger instant browser file download
    const imageURI = canvas.toDataURL("image/png");
    const link = document.createElement('a');
    link.download = `Receipt_${transactionData.invoiceNo}.png`;
    link.href = imageURI;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
```

---

## 9. Conclusion & Immediate Deployment Checklist

- [x] Multi-device touch responsiveness configured with $64\text{px}$ touch targets.
- [x] Automatic POS screen expansion & Kiosk Fullscreen mode integration.
- [x] Default branch routing for **JAPA Dagupan (Main Branch)** and **JAPA Manila**.
- [x] Multi-tier discount options (Percentage, Fixed Amount, Senior/PWD, Manager Passcode Override).
- [x] Transaction processing video transition using `assets/video/`.
- [x] Virtual Invoice/Receipt display modal with high-resolution PNG image download handler.
- [x] Simplified high-visibility CRUD controls across all monitoring and ERP modules.
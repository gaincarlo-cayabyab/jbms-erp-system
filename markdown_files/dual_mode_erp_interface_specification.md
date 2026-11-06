# Technical Specification: Dual-Mode UI Architecture (Desktop vs. POS Terminal Mode)

## 1. Executive Summary & Objective

This document outlines the architectural strategy, engineering guidelines, and UI/UX patterns required to deliver a responsive, dual-mode web application for our enterprise ERP system. The platform must dynamically adjust its user interface based on the operating context:

1. **Laptop / Desktop Mode**: Optimized for high information density, complex navigation, keyboard-first interactions, multi-window/modal workflows, and administrative task management.
2. **POS Terminal / Tablet Mode**: Optimized for high-throughput touch interactions, enlarged touch targets, simplified visual hierarchies, virtual keypad integration, and zero-clutter execution to prevent input errors on counter terminals.

---

## 2. System Architecture & Context Flow

### 2.1 Mode Resolution Flowchart

```
                          ┌───────────────────────────┐
                          │   User Logins / Enters    │
                          │        PIN Code           │
                          └─────────────┬─────────────┘
                                        │
                                        ▼
                          ┌───────────────────────────┐
                          │  Check 'erp_device_mode'  │
                          │   in Local Device Storage │
                          └─────────────┬─────────────┘
                                        │
                       ┌────────────────┴────────────────┐
                       ▼                                 ▼
             [ Device Preference Found ]       [ No Saved Preference ]
                       │                                 │
                       │                                 ▼
                       │                    ┌───────────────────────────┐
                       │                    │   Display Mode Selection  │
                       │                    │    Modal (Desktop/POS)    │
                       │                    └────────────┬──────────────┘
                       │                                 │
                       └────────────────┬────────────────┘
                                        │
                                        ▼
                          ┌───────────────────────────┐
                          │ Initialize DeviceContext  │
                          │   & Apply Global Class    │
                          └─────────────┬─────────────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
       ┌─────────────────────────┐             ┌─────────────────────────┐
       │   Desktop Mode Active   │             │    POS Terminal Active  │
       │                         │             │                         │
       │ • Compact Spacing       │             │ • 56px+ Touch Targets   │
       │ • Dense Data Tables     │             │ • Card & Grid Layouts   │
       │ • Multi-level Nav       │             │ • Custom On-Screen Key  │
       │ • Hardware Keyboard     │             │ • Auto-scroll on Focus  │
       └─────────────────────────┘             └─────────────────────────┘
```

---

## 3. Storage & State Persistence Strategy

To ensure seamless operation across physical cashier registers (which rarely change hardware) and standard office workstations, device configuration state must persist across sessions while remaining instantly switchable.

### 3.1 Persistence Layer Rules
* **Device Storage (`localStorage`)**: Saves `erp_device_mode` directly to the client browser. Physical POS terminals default to `'pos'` automatically on subsequent shifts without forcing cashiers to choose daily.
* **React Global Context (`DeviceContext`)**: Exposes current state, device toggle functions, and utility classes across all nested UI components.
* **Header / Settings Quick Toggle**: Admins or supervisors can switch modes instantly via a top-bar dropdown or shortcut without requiring a relog.

---

## 4. Comprehensive UX/UI Adaptation Matrix

| UI Attribute / Component | Desktop / Laptop Mode | POS Terminal / Tablet Mode |
| :--- | :--- | :--- |
| **Minimum Touch Target** | 32px – 40px (`py-2`, `px-3`) | 56px – 72px (`py-4`, `px-6`) |
| **Font Sizing Strategy** | Standard Body (14px – 16px) | Touch Optimized (18px – 24px) |
| **Primary Navigation** | Left Collapsible Sidebar with Nested Sub-menus | Top/Bottom Tab Bar or Action Grid |
| **Data Lists / Tables** | Compact Table Grid with Pagination & Column Filters | Tile Cards / Full-width Touch Rows with Infinite Scroll |
| **Forms & Input Triggers** | Inline text inputs, standard select dropdowns | Floating labels, large tap pickers, stepper buttons (`+`/`-`) |
| **Numerical Entry** | Hardware Numpad / Keyboard Focus | Built-in Touch Keypad Overlay |
| **Modals & Dialogs** | Centered Overlay Modals (Max Width: 600px - 800px) | Full-screen Sheet Sliders / Drawer Overlays |
| **Secondary Controls** | Hover Tooltips, Context Menus (Right-click) | Explicit Icon + Label Touch Buttons |

---

## 5. Virtual Keyboard & Viewport Management

Operating on touch-screen monitors or tablets (Android/iOS/ChromeOS POS devices) poses a distinct risk: the OS soft keyboard can pop up and obstruct critical input fields, order summaries, or submit buttons.

### 5.1 Viewport Configuration Meta Tag
Ensure the viewport resizes the layout container cleanly when a soft keyboard appears, rather than obscuring content:

```html
<meta 
  name="viewport" 
  content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, interactive-widget=resizes-content" 
/>
```

### 5.2 Smooth Viewport Scrolling on Focus
To guarantee active input visibility on touch displays:

```typescript
export const handlePosInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  const isPos = document.documentElement.classList.contains('pos-terminal-mode');
  if (isPos) {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  }
};
```

---

## 6. Full Technical Implementation Blueprint

### 6.1 `DeviceContext` (`src/context/DeviceContext.tsx`)

```tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type DeviceMode = 'desktop' | 'pos';

interface DeviceContextType {
  deviceMode: DeviceMode;
  setDeviceMode: (mode: DeviceMode) => void;
  toggleDeviceMode: () => void;
}

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

export const DeviceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [deviceMode, setDeviceModeState] = useState<DeviceMode>('desktop');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const storedMode = localStorage.getItem('erp_device_mode') as DeviceMode;
    if (storedMode === 'pos' || storedMode === 'desktop') {
      setDeviceModeState(storedMode);
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      document.documentElement.classList.remove('desktop-mode', 'pos-terminal-mode');
      document.documentElement.classList.add(
        deviceMode === 'pos' ? 'pos-terminal-mode' : 'desktop-mode'
      );
    }
  }, [deviceMode, isInitialized]);

  const setDeviceMode = (mode: DeviceMode) => {
    setDeviceModeState(mode);
    localStorage.setItem('erp_device_mode', mode);
  };

  const toggleDeviceMode = () => {
    const nextMode = deviceMode === 'desktop' ? 'pos' : 'desktop';
    setDeviceMode(nextMode);
  };

  return (
    <DeviceContext.Provider value={{ deviceMode, setDeviceMode, toggleDeviceMode }}>
      <div className={`w-full min-h-screen ${deviceMode === 'pos' ? 'touch-none-select' : ''}`}>
        {children}
      </div>
    </DeviceContext.Provider>
  );
};

export const useDeviceMode = () => {
  const context = useContext(DeviceContext);
  if (!context) {
    throw new Error('useDeviceMode must be used within a DeviceProvider');
  }
  return context;
};
```

---

### 6.2 Mode Selection Modal (`src/components/ModeSelectionModal.tsx`)

```tsx
'use client';

import React from 'react';
import { useDeviceMode, DeviceMode } from '../context/DeviceContext';
import { Monitor, Tablet, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ModeSelectionModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { deviceMode, setDeviceMode } = useDeviceMode();

  if (!isOpen) return null;

  const handleSelect = (mode: DeviceMode) => {
    setDeviceMode(mode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 max-w-lg w-full transform transition-all">
        <h2 className="text-2xl font-bold text-slate-800 text-center mb-2">
          Select Interface Mode
        </h2>
        <p className="text-slate-500 text-center text-sm mb-6">
          Optimize layout and touch controls for your hardware setup.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Desktop Mode */}
          <button
            onClick={() => handleSelect('desktop')}
            className={`relative flex flex-col items-center justify-center p-6 border-2 rounded-xl transition-all ${
              deviceMode === 'desktop'
                ? 'border-blue-600 bg-blue-50/40 text-blue-600 shadow-md'
                : 'border-slate-200 hover:border-slate-300 text-slate-700'
            }`}
          >
            {deviceMode === 'desktop' && (
              <span className="absolute top-3 right-3 bg-blue-600 text-white rounded-full p-1">
                <Check className="w-4 h-4" />
              </span>
            )}
            <Monitor className="w-12 h-12 mb-3 stroke-[1.5]" />
            <span className="font-semibold text-base">Desktop / Laptop</span>
            <span className="text-xs text-slate-400 mt-1 text-center">
              Dense tables & keyboard shortcuts
            </span>
          </button>

          {/* POS Mode */}
          <button
            onClick={() => handleSelect('pos')}
            className={`relative flex flex-col items-center justify-center p-6 border-2 rounded-xl transition-all ${
              deviceMode === 'pos'
                ? 'border-emerald-600 bg-emerald-50/40 text-emerald-600 shadow-md'
                : 'border-slate-200 hover:border-slate-300 text-slate-700'
            }`}
          >
            {deviceMode === 'pos' && (
              <span className="absolute top-3 right-3 bg-emerald-600 text-white rounded-full p-1">
                <Check className="w-4 h-4" />
              </span>
            )}
            <Tablet className="w-12 h-12 mb-3 stroke-[1.5]" />
            <span className="font-semibold text-base">POS Terminal</span>
            <span className="text-xs text-slate-400 mt-1 text-center">
              Large touch buttons & simplified layouts
            </span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-700 transition"
        >
          Confirm & Continue
        </button>
      </div>
    </div>
  );
};
```

---

### 6.3 Touch-Optimized On-Screen Keypad (`src/components/TouchKeypad.tsx`)

```tsx
'use client';

import React from 'react';
import { Delete, CornerDownLeft } from 'lucide-react';

interface KeypadProps {
  onKeyPress: (val: string) => void;
  onDelete: () => void;
  onSubmit?: () => void;
  className?: string;
}

export const TouchKeypad: React.FC<KeypadProps> = ({
  onKeyPress,
  onDelete,
  onSubmit,
  className = '',
}) => {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'];

  return (
    <div className={`grid grid-cols-3 gap-3 p-4 bg-slate-100 rounded-2xl shadow-inner ${className}`}>
      {keys.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => onKeyPress(key)}
          className="h-16 text-2xl font-bold bg-white text-slate-800 rounded-xl border border-slate-200 shadow-sm active:bg-slate-200 active:scale-95 transition-all flex items-center justify-center select-none"
        >
          {key}
        </button>
      ))}

      <button
        type="button"
        onClick={onDelete}
        className="h-16 text-xl bg-amber-100 text-amber-800 rounded-xl border border-amber-200 active:bg-amber-200 active:scale-95 transition-all flex items-center justify-center select-none"
      >
        <Delete className="w-7 h-7" />
      </button>

      {onSubmit && (
        <button
          type="button"
          onClick={onSubmit}
          className="col-span-3 h-16 bg-emerald-600 text-white text-xl font-bold rounded-xl shadow-md active:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-1 select-none"
        >
          <span>Complete Entry</span>
          <CornerDownLeft className="w-6 h-6" />
        </button>
      )}
    </div>
  );
};
```

---

### 6.4 Adaptive CSS Styling Strategy (`src/app/globals.css`)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Global Touch & Visual Overrides for POS Terminal Mode */
.pos-terminal-mode {
  /* Prevent accidental text selections during fast tapping */
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}

/* Enforce Minimum Touch Target Sizes */
.pos-terminal-mode button,
.pos-terminal-mode input,
.pos-terminal-mode select,
.pos-terminal-mode [role="button"] {
  min-height: 56px !important;
  font-size: 1.125rem !important; /* 18px */
}

/* Hide non-critical UI components on checkout screens when in POS mode */
.pos-terminal-mode .desktop-only {
  display: none !important;
}

/* Ensure Desktop view hides POS-only keypads */
.desktop-mode .pos-only {
  display: none !important;
}

/* Scroll Padding to Prevent Soft Keyboard Occlusion */
.pos-terminal-mode main {
  scroll-padding-bottom: 280px;
}
```

---

## 7. Performance & Offline Resilience for POS Devices

1. **Local State Caching**: Cache product catalogs, branch price books, and tax rules in `IndexedDB` or `localStorage` to preserve smooth touch interactions even under intermittent Wi-Fi conditions.
2. **Optimistic UI Updates**: Immediately update order totals and item cart lists on button tap, syncing background requests asynchronously to eliminate touch lag.
3. **Hardware Scanner Integration**: Handle barcode scanner inputs as standard programmatic keyboard buffer events (`window.addEventListener('keydown')`) regardless of device mode.

---

## 8. Development Implementation Roadmap

- [ ] **Phase 1**: Integrate `DeviceContext` into global App Provider.
- [ ] **Phase 2**: Add `ModeSelectionModal` to Post-PIN login workflow.
- [ ] **Phase 3**: Apply responsive dynamic styling (`pos-terminal-mode` vs `desktop-mode`) to checkout & stock management routes.
- [ ] **Phase 4**: Implement `TouchKeypad` for quantity and cash inputs in POS view.
- [ ] **Phase 5**: Quality Assurance testing on targeted hardware devices (iPad, Android Tablet, Touchscreen POS Terminals, Laptops).
# UrStudio — CyberCafe Photo & ID Card Printing Software

A production-ready, offline-first web application for cybercafés, photo studios, printing shops, and CSC document centers. Allows operators to rapidly crop, arrange, resize, and print passport photos, visa photos, and ID cards with exact physical print dimensions.

---

## 🚀 Key Features

### 1. Fast Photo Workflow
- **Flexible Upload**: Multi-file upload, drag-and-drop, clipboard paste (`Ctrl+V`), or camera capture.
- **Precision Cropping**: Locked physical ratios for:
  - Indian / EU Passport Photo (`35 × 45 mm`)
  - US Passport / Visa Photo (`2 × 2 inch` / `50.8 × 50.8 mm`)
  - Stamp Size Photo (`20 × 25 mm`)
  - Square & Custom Dimensions
- **Image Adjustments**: Brightness, Contrast, Saturation, and Grayscale filters.
- **Transformations**: 90° CW/CCW rotation, horizontal and vertical flips.

### 2. Dedicated ID Card & PVC Card Printing (One-by-One)
- **Dual Slots**: Dedicated upload & cropping for Front side and Back side.
- **CR80 Standard**: Locked to standard card proportions (`85.6 × 53.98 mm`).
- **Direct PVC Card Printing (One-by-One)**:
  - Specially designed for plastic card printers (Zebra, Evolis, Magicard, Fargo, or Epson PVC Card Trays).
  - Print Front side at exact CR80 size with 0 margin.
  - Step-by-step guidance to flip card in printer tray and print Back side.
- **Paper Sheet Printing (A4 / 4×6 / A5)**:
  - Layout options: **Stacked** (Front Top, Back Bottom for folding & laminating), **Side-by-Side**, **Front Only**, or **Back Only**.
  - Customizable copies (e.g. 1 set, 4 sets, 8 sets on A4).
  - Optional rounded cutting guide borders (`0.2mm` border with `2mm` radius).

### 3. PDF Upload & Direct Multi-Page Crop
- **High-Resolution 300 DPI Rendering**: Ingests PDF documents directly in the browser via offline PDF.js engine.
- **e-Aadhaar & Document Auto-Detection**: When uploading a 2-page e-Aadhaar or DL PDF, Page 1 is automatically assigned to Front and Page 2 to Back for immediate cropping.
- **Multi-Page Support**: Every page in a multi-page PDF document is extracted with thumbnail previews for quick cropping.

### 4. Color Accuracy: RGB Screen to CMY / CMYK Print Engine
- **The Problem Solved**: Monitors emit bright additive sRGB light, while photo printers lay down subtractive CMY/CMYK ink on reflective paper, frequently causing prints to turn out darker, muddier, or with red/magenta-shifted skin tones.
- **CMYK Soft-Proofing**: Toggle realistic print preview simulating real paper reflectivity and ink gamut limits before printing.
- **Shadow Lift / Dot Gain Calibration**: Built-in tone curve compensation (Gamma 1.08–1.15) to counteract physical ink absorption and shadow crushing.
- **Skin Tone / Magenta Balancing**: Fine-tune printer color casts and remove reddish tint on portraits.
- **Exact Browser Print Color Rules**: CSS print stylesheets enforce `-webkit-print-color-adjust: exact` and high-contrast image rendering.

### 5. Automatic Sheet Layout Engine
- Calculates maximum possible copies on any paper size without overflow.
- Supported paper sizes: **A4**, **4×6 inch**, **A5**, **5×7 inch**, **Letter**, **Legal**, and **PVC Card (CR80)**.
- Full control over Margins (top, bottom, left, right) and Gaps (horizontal, vertical).
- Optional cutting guides (subtle dashed lines around photos for fast trimming).

### 6. Template Manager
- Built-in library of international photo and ID card presets.
- Custom Template Creator: define custom dimensions in `mm` or `in`, default paper, and copies.
- Stored locally via IndexedDB / localStorage.

### 7. 100% Offline-First & Privacy-Focused
- All image & PDF manipulation runs entirely client-side using the HTML5 Canvas API and local worker.
- Customer documents & photos are **never** uploaded to an external server.
- Works 100% offline without an internet connection.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl + Z` | Undo |
| `Ctrl + Shift + Z` | Redo |
| `Ctrl + P` | Print Preview |
| `Esc` | Back / Cancel |

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Turbopack)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI & Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **State Management**: [Zustand](https://zustand.docs.pmnd.rs/) with localStorage persistence
- **Image Processing**: HTML5 Canvas API, [Cropper.js](https://fengyuanchen.github.io/cropperjs/)
- **Storage**: [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) via `idb-keyval`
- **Testing**: [Node.js Native Test Runner](https://nodejs.org/api/test.html) via `tsx`

---

## 🏁 Getting Started

### Prerequisites
- Node.js 20+ installed
- npm installed

### Installation
```bash
# Clone the repository
git clone https://github.com/m-sohel/iPrint.git
cd iPrint

# Install dependencies
npm install
```

### Running Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running Tests
```bash
npm test
```

### Production Build
```bash
npm run build
npm start
```

---

## 🖨️ Printer Calibration Tips

When printing from the browser print dialog:
1. **Scale**: Set to **100%** or **Actual Size** (do NOT use "Fit to Page").
2. **Margins**: Set to **None**.
3. **Paper Size**: Ensure the selected paper in the printer dialog matches your sheet (e.g. A4, 4×6, or CR80 card).
4. **Headers & Footers**: Disabled.

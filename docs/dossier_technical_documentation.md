# Forensic Dossier System: Technical Documentation

This document provides a detailed overview of the architectural design, maintenance procedures, and expansion strategies for the forensic dossier generation system in **ThreatIntel**.

## 1. System Architecture

The dossier system is built upon a distributed, reactive architecture that bridges real-time forensic capture with structured reporting and long-term persistence.

### High-Level Components

*   **Frontend Recorder (`DossierRecorder.vue`)**: A global floating interface that manages the capture of forensic evidence (IPs, Attacks, Telnet sessions) during investigations. It handles the preview (HTML/Iframe), style selection (Classic/HUD), and the persistence dialog.
*   **Pinia Store (`dossier.ts`)**: The brain of the recorder. It maintains the reactive list of captured `sections`, manages the recording state (`isRecording`), and automatically persists the session to `localStorage` to survive page reloads.
*   **Security & Sanitization (`ReportService.ts`)**: The core backend engine. It takes raw database objects, sanitizes them for reporting (removing sensitive fields), and orchestrates the rendering process.
*   **Report Generation Flow**:
    *   **On-the-fly (`ReportController`)**: Used for previews and immediate PDF downloads. No data is saved to MongoDB.
    *   **Archival (`DossierController`)**: Saves the dossier structure to MongoDB for later export, forensic review, or institutional sharing.

---

## 2. Dossier Generation Flows

### Flow A: Dynamic Capture (On-the-fly)
When the user clicks "Preview" or "Download PDF" in the recorder bar:
1.  Frontend sends the `sections` (raw data + template keys) and `style` to `/api/reports/custom`.
2.  `ReportController` invokes `ReportService.generateCustomReport`.
3.  `ReportService` iterates over sections, renders each one using a specific **EJS Fragment** (see section 3), and combines them into a master layout.
4.  If PDF is requested, **Puppeteer** renders the final HTML and returns a stream.

### Flow B: Forensic Archiving (Persistence)
When the user clicks "Save":
1.  Dossier metadata (title, description, tags) and sections are sent to `/api/dossiers`.
2.  `DossierService` saves the document to MongoDB.
3.  The archive list (`Dossiers.vue`) refreshes automatically via the reactive `lastSavedAt` trigger in the Pinia store.

---

## 3. Extensibility Guide: Adding New Sections

The system is designed to be highly modular. To add a new type of forensic section (e.g., "Firewall Filter Details"), follow these steps:

### Step 1: Create EJS Fragments
You must create a fragment for each supported style in `core/templates/reports/fragments/`:
*   `classic/firewall-block.ejs`: Institutional layout (tables, neutral colors).
*   `hud/firewall-block.ejs`: Tactical layout (glowing borders, high-density badges).

### Step 2: Update Capture Logic (Frontend)
In the relevant Detail View (e.g., `FirewallDetail.vue`), add a call to `dossierStore.addSection`:
```javascript
dossierStore.addSection('firewall-block', firewallData, renderedTextFallback);
```

### Step 3: Backend Mapping
`ReportService` automatically looks for fragments based on the `templateKey` provided. Ensure that `IDossierSection` in `DossierSchema.ts` is updated if you introduce a strictly new top-level type for backend typification.

---

## 4. Internationalization (i18n) & Themes

The system supports multiple languages and two distinct visual identities.

### Classic vs. HUD Themes
*   **Classic**: Designed for formal reports, using standard typography and an "institutional" color palette. Ideal for printing and email distribution.
*   **HUD (Telex-style)**: A high-contrast, "cyber-sleek" design with glowing accents. Ideal for real-time monitoring and high-end security operations centers (SOC).

### The Role of "Telex" and Fallbacks
The `generic-telex.ejs` template serves as a critical fallback mechanism:
1.  **Clipboard as Raw Data**: When a user captures raw text or generic logs (not structured objects), the system uses the "Telex" mode.
2.  **i18n Injection**: `telex` uses i18n strings (like `common.copy`) to bridge the gap between raw data and a human-readable report.
3.  **Rendered Text Fallback**: If a section's metadata is missing or corrupted, the `renderedText` (captured at the moment of recording) is used as a safety net to ensure the report remains readable.

---

## 5. Maintenance Best Practices

### Updating Styles
Global report styles (CSS) should be modified in the main EJS layout files:
*   `core/templates/reports/classic-dossier.ejs`
*   `core/templates/reports/hud-dossier.ejs`

### Adding a Language
To add a new language support:
1.  Update all `.json` files in `core/locales/` and `frontend/dashboard/src/locales/`.
2.  Update `LanguageSwitcher.vue` to include the new flag and code.
3.  The backend will automatically pick up the new locale via the `locale` parameter in the report request.

### Typification
Keep `IDossierSection` in `DossierSchema.ts` updated. Every new section type should be reflected in the backend interfaces to ensure strict type-safety across the generation chain.

> [!IMPORTANT]
> Always test new fragments in both `classic` and `hud` styles to ensure visual consistency and print compatibility.

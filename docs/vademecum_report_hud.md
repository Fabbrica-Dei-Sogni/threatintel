# Vademecum Tecnico: Report Selection HUD
> **Guida Architetturale e di Troubleshooting per il Selettore Dossier**

Questo documento descrive le logiche "sotto il cofano" che governano la visualizzazione dei popup di generazione report (`ReportActions.vue` e `DossierReportActions.vue`).

---

## 🏗️ 1. Architettura e Ciclo di Vita

Il selettore utilizza un sistema di rendering disaccoppiato per evitare problemi di `overflow: hidden` o `z-index` limitati dai contenitori genitori.

### Il Ruolo del Teleport
*   **Logica**: Il menu viene "estratto" dalla gerarchia locale e iniettato direttamente sotto il `<body>`.
*   **Condizione (Modalità Button)**: `:disabled="!isMobile"`. Su desktop il menu resta agganciato al pulsante (`position: absolute`), su mobile viene teletrasportato per permetterne la centratura fissa.
*   **Condizione (Modalità Sticky)**: Teleport **sempre attivo**. Essendo una "linguetta" fissa a lato, il menu deve fluttuare sopra ogni altro elemento della pagina.

---

## 📍 2. Strategie di Posizionamento

Il corretto posizionamento dipende dalla combinazione di **Mode** (Sticky vs Button) e **Device** (Desktop vs Mobile).

| Scenario | Classe CSS | Logica di Posizionamento |
| :--- | :--- | :--- |
| **Sticky Desktop** | `.action-menu.mode-sticky` | `position: fixed` con coordinate statiche (`top: 15vh`, `right: 64px`). |
| **Button Desktop** | `.popover-menu` | `position: absolute` rispetto al container `relative` del pulsante. |
| **Tutto Mobile** | `.is-mobile-menu` | `position: fixed` con `top: 50%; left: 50%` e `translate(-50%, -50%)`. |

---

## 📊 3. Gerarchia Visuale (Z-Index)

Per garantire che il "Forensic Generator" sia sempre in cima alla "pila" di elementi:

1.  **Livello 0 (Pagina)**: Contenuto standard.
2.  **Livello 9000 (`.menu-backdrop`)**: L'oscuramento che copre la dashboard.
3.  **Livello 9500+ (`.action-menu`)**: Il selettore tattico.
4.  **Livello 10000+ (`.preview-modal`)**: L'anteprima finale del dossier.

> [!CAUTION]
> Se aggiungi nuovi componenti globali (es. notifiche o altre modali), assicurati che non superino lo `z-index: 9000` a meno che non debbano stare sopra il generatore di dossier.

---

## 🛠️ 4. Guida al Troubleshooting (Cosa fare se si rompe?)

### 🔴 Problema: "L'ombra si vede ma il menu è sparito"
*   **Causa probabile**: Mancano le coordinate di posizionamento fisse o l'elemento è finito fuori viewport (es. coordinate `0,0`).
*   **Soluzione**: Controlla che le classi `.mode-sticky` o `.popover-menu` abbiano `top` e `right/left` definiti. Assicurati che `position` sia `fixed` o `absolute`.

### 🔴 Problema: "Il menu scatta o si muove male durante l'apertura"
*   **Causa probabile**: Conflitto tra le trasformazioni della `<transition>` di Vue e il `translate(-50%, -50%)` del CSS mobile.
*   **Soluzione**: Usa `!important` solo sulle proprietà di posizionamento finale e assicurati che la transizione (`slide-card` o `popover`) agisca su proprietà diverse o che il `transform` sia resettato correttamente.

### 🔴 Problema: "ReferenceError: X is not defined"
*   **Causa probabile**: Durante un refactoring sono state rimosse variabili reattive (es. `showMenu`, `isMobile`) dal blocco `<script setup>`.
*   **Soluzione**: Verifica che tutte le variabili usate nel template (cerca `v-if`, `@click`, `:class`) siano dichiarate come `ref()` o `computed()`.

---

## 🎨 5. Design System "Cyber-Sleek"

Per mantenere l'estetica premium coerente:
*   **Vetro (Glassmorphism)**: Usa sempre la classe `.glass-morphism` che combina `rgba(15, 23, 42, 0.98)` con un `blur(25px)`.
*   **Accent Color**: Utilizza la variabile CSS `--theme-color` (legata alla prop `accentColor` via `v-bind`).
*   **Tipografia**: I titoli devono essere sempre `toUpperCase()` con un generoso `letter-spacing` (minimo `2px`).

---

> [!TIP]
> **Promemoria**: Ogni volta che modifichi `ReportActions.vue`, ricordati di sincronizzare anche `DossierReportActions.vue` (il generatore di dossier custom) per mantenere l'esperienza utente uniforme al 100%.

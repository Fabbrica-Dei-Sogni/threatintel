# Integrazione Architetturale: Rate Breach Dossier (Fase 2)

L'obiettivo della Fase 2, dopo aver completato l'integrazione granulare nella clipboard TELEX per i singoli eventi, è definire l'intera architettura di persistenza e visualizzazione avanzata (Backend + Frontend) per trasformare il raw testuale di "Rate Breach" in una `DossierSection` di prima classe.

## Proposed Changes

### Architettura Dati (Backend & MongoDB)

Aggiungeremo la factory o il POJO specifico per la validazione dello schema della nuova sezione nel DB.
#### [NEW] Backend POJO (`rate_breach`)
- Definiremo una struttura dati strutturata da salvare su MongoDB che conterrà i timestamp e le signature esatte del breach (ip, limitType, path, ecc.) invece di salvare solo testo flat.

### Modelli di Report Backend EJS (Classic e HUD)

Aggiorneremo il parser EJS e aggiungeremo i due fragments specializzati per il rendering lato server in PDF.
#### [MODIFY] `core/templates/reports/classic-dossier.ejs` & `hud-dossier.ejs`
- Reinseriremo il mapping condizionale per renderizzare la sezione.

#### [NEW] `core/templates/reports/fragments/classic/rate-breach.ejs`
- Layout minimale e formale orientato alla stampa testuale.

#### [NEW] `core/templates/reports/fragments/hud/rate-breach.ejs`
- Layout Cyber/HUD che utilizza la palette `pulse-magma` (⚡) coerente con la dashboard per l'esportazione dinamica.

### Componenti Modificatore/Renderizzatore (Frontend Vue)

Creeremo i componenti specializzati affinché il dossier non ricada più sul "Generic Text", dando all'analista campi ad hoc.

#### [MODIFY] `frontend/dashboard/src/views/dossiers/DossierDetail.vue`
- Reinseriremo `rate_breach` nel menù a tendina 'Aggiungi Sezione'.

#### [MODIFY] Componenti Mapper
- `DossierSectionRenderer.vue`
- `DossierSectionEditor.vue`

#### [NEW] Componenti Ad Hoc Rate Breach
- **`RateBreachSection.vue`**: Veste grafica per la read-only view.
- **`RateBreachEditor.vue`**: Form editabile con un POJO pre-costruito e campi mappati esattamente come il log event della vista dettagli.

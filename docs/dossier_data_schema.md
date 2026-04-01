# Forensic Dossier Data Schema: Types & TemplateKeys

This document defines the structured data schema for the **ThreatIntel** forensic dossier system. It outlines the relationship between macro-categories (`type`) and specific template identifiers (`templateKey`).

## 1. Macro-Categories (`type`)

The system categorizes all forensic evidence into 4 primary types. This classification is used for database indexing, UI grouping, and applying high-level styling logic.

| Type | Description | Primary Source |
| :--- | :--- | :--- |
| `ip` | Intelligence relating to a specific IP address (Geo, Reputation, ISP). | IP Detail View / AbuseIPDB |
| `attack` | HTTP-layer threat analysis and request forensics. | Nginx Logs / Pattern Analysis |
| `telnet` | Interactive session forensics and command execution. | Cowrie Honeypot |
| `generic` | Custom notes, free-text pointers, or uncategorized data. | Manual user input |

---

## 2. Template Mapping Table

The `templateKey` determines which **EJS Fragment** (backend) and **Vue Editor** (frontend) is used to process the payload.

| Macro Type | `templateKey` | Description | DTO Model |
| :--- | :--- | :--- | :--- |
| **IP** | `clipboard.ip` | Base IP identification. | `IIpSectionData` |
| **IP** | `clipboard.ipDetails.geo` | Geographical & GPS metrics. | `IIpGeoSectionData` |
| **IP** | `clipboard.ipDetails.net` | ISP, AS, and Network Org info. | `IIpNetSectionData` |
| **IP** | `clipboard.ipDetails.abuse` | Reputation score & blacklist status. | `IIpAbuseSectionData` |
| **IP** | `clipboard.ipDetails.whois` | Full raw WHOIS record. | `IIpWhoisSectionData` |
| **IP** | `clipboard.ipDetails.abuseLog` | Single forensic report comment. | `IIpAbuseLogSectionData` |
| **ATTACK** | `clipboard.attackDetail.summary` | Attack HUD (Defcon, RPS, Duration). | `IAttackSummarySectionData` |
| **ATTACK** | `clipboard.attackDetail.log` | Deep request log (Payload, Headers). | `IAttackLogSectionData` |
| **ATTACK** | `clipboard.attackTechnique` | Specific threat signature detection. | `IAttackTechniqueData` |
| **TELNET** | `clipboard.telnetDetail.summary` | Session metadata & event count. | `ITelnetSummarySectionData` |
| **TELNET** | `clipboard.telnetDetail.timelineRow` | Individual command execution event. | `ITelnetTimelineRowData` |
| **GENERIC** | `clipboard.generic` | Free-text investigative notes. | `IGenericSectionData` |

---

## 3. Data Flow & Persistence

### 3.1 Template Key Resolution
The mapping between `templateKey` and macro `type` is performed in the **Pinia Store** ([dossier.ts](../frontend/dashboard/src/stores/dossier.ts)) during the `addSection` call:

```typescript
// Assignment logic
let type: DossierSection['type'] = 'generic';
if (templateKey.includes('ipDetails')) type = 'ip';
else if (templateKey.includes('attackDetail')) type = 'attack';
else if (templateKey.includes('telnetDetail')) type = 'telnet';
```

### 3.2 UI Dispatching
The frontend uses the [DossierSectionEditor.vue](../frontend/dashboard/src/components/dossier/DossierSectionEditor.vue) to dynamically load the appropriate "Cyber-Slim" editor base on the `templateKey`.

### 3.3 Backend Rendering
Each `templateKey` corresponds to two fragments (Classic/HUD) in the backend `core/templates/reports/fragments/` directory.

---

## 4. How to Extend
To add a new data type:
1.  Define a new interface in `DossierDTO.ts` (Frontend) and `DossierSchema.ts` (Backend).
2.  Register a new `templateKey`.
3.  Implement the specialized **Vue Editor** in `src/components/dossier/editors/`.
4.  Create the **EJS Fragments** for reporting.

> [!TIP]
> Always use the `clipboard.*` prefix for template keys to maintain consistency with the forensic recorder logic.

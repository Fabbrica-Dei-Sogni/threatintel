# ThreatIntel Dashboard - Reference Implementation

This application is the official reference frontend implementation for the **ThreatIntel Distributed Forensics Engine**.

## Overview
Built with Vue 3, Vite, and Pinia, this dashboard provides a high-end "Tech-HUD" interface designed for Security Operations Centers (SOC) and forensic analysts. It demonstrates how to interact with the ThreatIntel Backend API to visualize:
- Real-time Security Telemetry.
- Global Attack Maps.
- Advanced Campaign Discovery & Correlation.
- Interactive Forensic Dossiers.

## Licensing Status
This frontend is provided as a **Reference Implementation**.

*   **Educational & Research Use**: You are free to study, modify, and use this code for learning or personal research purposes.
*   **Commercial & Production Use**: Using this specific interface, its design, or its components for commercial purposes or in production environments requires a valid commercial license from the author (**Alessandro Modica**).

For more details, see [LICENSE_NOTICE.md](./LICENSE_NOTICE.md) and the root `LICENSE.md` file for the core engine terms.

## Project Structure
- `src/components`: UI components including the "Cyber-Sleek" design system.
- `src/views`: Main dashboard views (Telemetry, Campaigns, Logs).
- `src/store`: Pinia stores for state management.
- `src/composable`: Logic hooks for API interaction.

## Setup
```bash
npm install
npm run dev
```

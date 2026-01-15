# Protocol Filtering and Pipeline Optimization

**Date**: 2026-01-15
**Version**: 1.1.0

## Overview

This document details the implementation of Protocol Filtering (HTTP/SSH) across the frontend and backend, as well as critical performance optimizations applied to the forensic analysis pipeline.

---

## 1. Protocol Filtering Implementation

To support multi-protocol threat intelligence (HTTP and SSH), we implemented a vertical slice feature allowing users to filter data based on the protocol.

### Backend Architecture (`ThreatLogService`)

The backend logic was enhanced to support a flexible `protocol` filter.

*   **Dynamic Query Building**: The `buildRegExpFilter` method in `ThreatLogService.ts` was modified.
*   **Legacy Support**:
    *   **HTTP**: The implementation ensures backward compatibility. Selecting 'HTTP' includes documents where:
        *   `protocol` is `'http'`
        *   `protocol` is `null`
        *   `protocol` does not exist (legacy logs)
    *   **SSH**: Strict matching for `protocol: 'ssh'`.

```typescript
// Logic snippet
if (value === 'http') {
    mongoFilters.$or = [
        { protocol: 'http' },
        { protocol: { $exists: false } },
        { protocol: null }
    ];
}
```

### Frontend Components (`ProtocolSelector`)

A new reusable Vue component `ProtocolSelector.vue` was created.

*   **Reusability**: Designed to be used on any page requiring protocol context switching.
*   **Theming**: Supports a `theme` prop (`light` vs `dark`) to adapt to different page contexts (e.g., standard tables vs dark dashboard widgets).
*   **Integration**:
    *   **Attacks List**: Filter attacks by protocol.
    *   **Log Requests**: Filter raw logs by protocol.
    *   **Dashboard (Home)**: Added to "Recent Attacks" and "Recent Logs" widgets with `theme="dark"` for seamless UI integration.

---

## 2. Pipeline Performance Optimization

### The Problem

The `ForensicPipelineService` was encountering `OutOfMemory` errors during the aggregation stage when processing large datasets (e.g., 30 days of data). The MongoDB `$group` stage was accumulating too much document data in memory.

### The Solution

We optimized the `GroupingStage` by explicitly projecting only the necessary fields *before* and *during* the grouping operation.

1.  **Field Projection**: Instead of grouping entire documents (`$$ROOT`), we now create a lean object containing only required fields (`ip`, `score`, `timestamp`, `geo`, etc.).
2.  **Memory Footprint**: Drastically reduced the memory usage of the aggregation pipeline.

```typescript
// Grouping logic optimization
$group: {
    _id: "$request.ip",
    // ...
    latestEntry: {
        $last: {
            // Project only strictly necessary fields
            timestamp: "$timestamp",
            score: "$score",
            headers: "$request.headers.user-agent",
            geo: "$ipDetailsId.ipinfo"
        }
    }
}
```

### Timeout Adjustment

*   **Server**: Increased server-side timeout to 60 seconds.
*   **Client**: Updated Axios configuration in `api/index.ts` to 60,000ms to prevent premature client-side timeouts during heavy aggregations.

# Forensic Pipeline Service Architecture

**Version**: 1.0.0
**Status**: Stable
**Related Service**: `ForensicPipelineService.ts`

---

## 🏗️ Overview

The `ForensicPipelineService` is a modern, modular replacement for the legacy `ForensicService`. It utilizes the **Pipeline Builder Pattern** to construct complex MongoDB aggregation pipelines for threat analysis.

Unlike the legacy monolithic approach, this service breaks down the pipeline into distinct, reusable **Stages**. This architecture allows for easier testing, maintenance, and future extension (e.g., adding specific stages for SSH or other protocols).

---

## 🧩 Key Components

### 1. ForensicPipelineBuilder
The builder orchestrates the construction of the pipeline. It allows stages to be added sequentially and compiles them into a final array of MongoDB aggregation steps.

```typescript
const builder = new ForensicPipelineBuilder();
const pipeline = builder
    .addStage(new TimeFilterStage(start, end))
    .addStage(new MatchFilterStage(filters))
    .addStage(new GroupingStage())
    .build();
```

### 2. Pipeline Stages
Each stage implements the `PipelineStage` interface and encapsulates a specific logical unit of the aggregation.

#### `TimeFilterStage`
- **Purpose**: Filters logs based on a time range.
- **Output**: `$match` stage with timestamp constraints.

#### `MatchFilterStage`
- **Purpose**: Applies generic MongoDB filters (e.g., specific IP, status code).
- **Output**: `$match` stage with dynamic queries.

#### `GroupingStage`
- **Purpose**: Aggregates logs by IP address.
- **Output**: `$group` stage + `$lookup` for rate limit events + `$replaceRoot` to flatten the structure.
- **Key Fields**:
    - `logsRaggruppati`: Array of all logs for the IP.
    - `totaleLogs`: Count of logs.
    - `firstSeen` / `lastSeen`: Timestamps.

#### `AttackStatsStage`
- **Purpose**: Calculates core metrics from the grouped data.
- **Output**: `$addFields` stages.
- **Metrics**:
    - `attackDurationMinutes`: Attack duration in minutes.
    - `rps` (Requests Per Second): Attack intensity.
    - `averageScore`: Average threat score of the logs.
    - `attackPatterns`: Distinct fingerprint indicators found in the logs.

#### `ScoringStage`
- **Purpose**: Assigns a `dangerScore` and `dangerLevel` based on calculated metrics.
- **Output**: `$addFields` stages.
- **Logic**:
    - Normalizes metrics (RPS, Duration, Unique Techniques) based on configurable "Tolerance Weights".
    - Calculates a final score using "Danger Weights".
    - Determines `dangerLevel` (1-5) and labels like `intensityAttack` (e.g., "burst lampo", "persistente alto").

---

## 🚀 Optimization & Improvements

The new pipeline introduces several optimizations over the legacy implementation:

1.  **Modular Design**: Each stage is a separate class, preventing the "God Object" anti-pattern.
2.  **Optimized Calculations**: Redundant inline mathematical operations were consolidated into `AttackStatsStage`, changing downstream stages to use pre-calculated fields (e.g., `$attackDurationMinutes`) instead of re-computing them.
3.  **Extensibility**: New protocols (like SSH) can reuse common stages (Time, Match) while implementing specific analysis stages (e.g., `SshCommandAnalysisStage`).

---

## ⚠️ Legacy Compatibility

The legacy `ForensicService` has been marked as **@deprecated**.
It is retained temporarily for reference but should not be used for new features.

- **Legacy**: `ForensicService.buildAttackGroupsBasePipeline`
- **New**: `ForensicPipelineService.buildStandardPipeline`

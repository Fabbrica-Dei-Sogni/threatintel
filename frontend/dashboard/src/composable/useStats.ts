// src/composable/useStats.ts
import { ref, reactive } from 'vue';
import { fetchStats } from '../api/index';
import { useViewSettingsStore } from '../stores/viewSettings';
import { storeToRefs } from 'pinia';

export function useStats() {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const stats = ref<any>(null);

  const viewStore = useViewSettingsStore();
  const { 
    telemetryTimeframe: selectedTimeframe,
    telemetryScore: selectedScore,
    telemetryLevel: selectedLevel,
    telemetryTop: selectedTop,
    telemetryMinLogs: selectedMinLogs
  } = storeToRefs(viewStore);

  const dynamicThresholds = reactive({
    info: 0,
    low: 15,
    med: 50,
    high: 80
  });

  const recalibrateThresholds = (dist: any) => {
    if (!dist) return;

    const min = dist.min || 0;
    const max = dist.max || 100;
    const avg = dist.avg || 15;

    // Normated thresholds calculation
    dynamicThresholds.info = Math.floor(min);
    dynamicThresholds.low = Math.floor(min + (avg - min) * 0.5);
    dynamicThresholds.med = Math.floor(avg);
    dynamicThresholds.high = Math.floor(avg + (max - avg) * 0.6);

    // Order and spacing correction
    if (dynamicThresholds.low <= dynamicThresholds.info) dynamicThresholds.low = dynamicThresholds.info + 2;
    if (dynamicThresholds.med <= dynamicThresholds.low) dynamicThresholds.med = dynamicThresholds.low + 5;
    if (dynamicThresholds.high <= dynamicThresholds.med) dynamicThresholds.high = dynamicThresholds.med + 10;
    if (dynamicThresholds.high > 100) dynamicThresholds.high = 100;

    // Sync selectedScore only if we are in a standard state
    const currentLvl = selectedLevel.value as keyof typeof dynamicThresholds;
    if (dynamicThresholds[currentLvl] !== undefined) {
      selectedScore.value = dynamicThresholds[currentLvl];
    }
  };

  const loadStats = async () => {
    if (loading.value) return;

    loading.value = true;
    error.value = null;
    try {
      const topParam = selectedTop.value === 'all' ? 'all' : parseInt(selectedTop.value as string, 10);
      const data = await fetchStats(selectedTimeframe.value, selectedScore.value, topParam, selectedMinLogs.value);
      stats.value = data.stats;

      if (data.stats?.scoreDistribution) {
        recalibrateThresholds(data.stats.scoreDistribution);
      }
    } catch (err: any) {
      console.error('[useStats] Error loading stats:', err);
      error.value = err.message || 'Error loading statistics';
    } finally {
      loading.value = false;
    }
  };

  const setTimeframe = (tf: string) => {
    selectedTimeframe.value = tf;
    loadStats();
  };

  const setScore = (score: number, level: string) => {
    selectedScore.value = score;
    selectedLevel.value = level;
    loadStats();
  };

  const setTop = (top: string | number) => {
    selectedTop.value = top.toString();
    loadStats();
  };

  const setMinLogs = (val: number) => {
    selectedMinLogs.value = val;
    loadStats();
  };

  const resetFilters = () => {
    selectedTimeframe.value = '24h';
    selectedLevel.value = 'low';
    selectedScore.value = 15;
    selectedMinLogs.value = 10;
    loadStats();
  };

  // Sync selectedLevel on init
  const syncLevelFromScore = () => {
    if (selectedScore.value >= dynamicThresholds.high) selectedLevel.value = 'high';
    else if (selectedScore.value >= dynamicThresholds.med) selectedLevel.value = 'med';
    else if (selectedScore.value >= dynamicThresholds.low) selectedLevel.value = 'low';
    else selectedLevel.value = 'info';
  };
  
  if (!selectedLevel.value) {
    syncLevelFromScore();
  }

  return {
    loading,
    error,
    stats,
    selectedTimeframe,
    selectedScore,
    selectedLevel,
    selectedTop,
    selectedMinLogs,
    dynamicThresholds,
    loadStats,
    setTimeframe,
    setScore,
    setTop,
    setMinLogs,
    resetFilters
  };
}

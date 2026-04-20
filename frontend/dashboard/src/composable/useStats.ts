// src/composable/useStats.ts
import { ref, reactive, watch } from 'vue';
import { fetchStats } from '../api/index';

export function useStats() {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const stats = ref<any>(null);

  // Filter state
  const selectedTimeframe = ref(localStorage.getItem('telemetry_timeframe') || '24h');
  const selectedScore = ref(parseInt(localStorage.getItem('telemetry_score') || '15', 10));
  const selectedLevel = ref('low');
  const selectedTop = ref(localStorage.getItem('telemetry_top') || '10');

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

    // Sync selectedScore ONLY if it was previously set to a standard threshold
    // This avoids "jumping" if the user manually adjusted it (if we add a slider later)
    // For now, it ensures the UI level buttons stay in sync with the data.
    const currentLvl = selectedLevel.value as keyof typeof dynamicThresholds;
    selectedScore.value = dynamicThresholds[currentLvl];
  };

  const loadStats = async () => {
    if (loading.value) return;

    loading.value = true;
    error.value = null;
    try {
      const topParam = selectedTop.value === 'all' ? 'all' : parseInt(selectedTop.value as string, 10);
      const data = await fetchStats(selectedTimeframe.value, selectedScore.value, topParam);
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
    localStorage.setItem('telemetry_timeframe', tf);
    loadStats();
  };

  const setScore = (score: number, level: string) => {
    selectedScore.value = score;
    selectedLevel.value = level;
    localStorage.setItem('telemetry_score', score.toString());
    loadStats();
  };

  const setTop = (top: string | number) => {
    selectedTop.value = top.toString();
    localStorage.setItem('telemetry_top', top.toString());
    loadStats();
  };

  const resetFilters = () => {
    selectedTimeframe.value = '24h';
    selectedLevel.value = 'low';
    selectedScore.value = 15; // Standard fallback
    localStorage.setItem('telemetry_timeframe', '24h');
    localStorage.setItem('telemetry_score', '15');
    loadStats();
  };

  // Sync selectedLevel on init
  const syncLevelFromScore = () => {
    if (selectedScore.value >= dynamicThresholds.high) selectedLevel.value = 'high';
    else if (selectedScore.value >= dynamicThresholds.med) selectedLevel.value = 'med';
    else if (selectedScore.value >= dynamicThresholds.low) selectedLevel.value = 'low';
    else selectedLevel.value = 'info';
  };
  syncLevelFromScore();

  return {
    loading,
    error,
    stats,
    selectedTimeframe,
    selectedScore,
    selectedLevel,
    selectedTop,
    dynamicThresholds,
    loadStats,
    setTimeframe,
    setScore,
    setTop,
    resetFilters
  };
}

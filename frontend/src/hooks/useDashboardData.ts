import { useCallback, useEffect } from 'react';
import { savePlannerPatch } from '@/lib/planner-storage';
import { fetchDashboard, updatePreferences } from '@/services/api';
import { ensureEmbeddedBackend } from '@/services/backendProcess';
import { useDashboardStore } from '@/store/useDashboardStore';
import type { Planner, Preferences } from '@/types/dashboard';

const POLL_INTERVAL_MS = 60_000;

export function useDashboardData() {
  const { data, loading, error, setData, setError, setLoading } = useDashboardStore();

  const loadDashboard = useCallback(async () => {
    try {
      const payload = await fetchDashboard();
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dashboard');
    }
  }, [setData, setError]);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);
      try {
        await ensureEmbeddedBackend();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Falha ao iniciar backend embutido. Tente abrir novamente.';
        setError(message);
      }

      if (!active) {
        return;
      }
      await loadDashboard();
    })();

    const timer = window.setInterval(() => {
      if (active) {
        void loadDashboard();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [loadDashboard, setLoading]);

  const savePreferences = useCallback(
    async (preferences: Partial<Preferences>) => {
      await updatePreferences(preferences);
      await loadDashboard();
    },
    [loadDashboard]
  );

  const savePlanner = useCallback(async (patch: Partial<Planner>) => {
    const current = useDashboardStore.getState().data;
    if (!current) {
      return;
    }

    const nextPlanner = savePlannerPatch(current.planner, patch);
    setData({ ...current, planner: nextPlanner });
  }, [setData]);

  return {
    data,
    loading,
    error,
    reload: loadDashboard,
    savePreferences,
    savePlanner
  };
}

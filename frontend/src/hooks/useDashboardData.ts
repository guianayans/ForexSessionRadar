import { useCallback, useEffect } from 'react';
import { askAssistant, fetchDashboard, updatePlanner, updatePreferences } from '@/services/api';
import { ensureEmbeddedBackend } from '@/services/backendProcess';
import { useDashboardStore } from '@/store/useDashboardStore';
import type { AssistantHistoryMessage, Planner, Preferences } from '@/types/dashboard';

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

  const savePlanner = useCallback(
    async (planner: Partial<Planner>) => {
      await updatePlanner(planner);
      await loadDashboard();
    },
    [loadDashboard]
  );

  const queryAssistant = useCallback(
    (question: string, apiKey?: string, history?: AssistantHistoryMessage[]) => askAssistant(question, apiKey, history),
    []
  );

  return {
    data,
    loading,
    error,
    reload: loadDashboard,
    savePreferences,
    savePlanner,
    queryAssistant
  };
}

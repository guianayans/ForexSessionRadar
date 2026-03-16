import { create } from 'zustand';
import type { DashboardPayload } from '@/types/dashboard';

interface DashboardState {
  data: DashboardPayload | null;
  loading: boolean;
  error: string | null;
  setData: (data: DashboardPayload) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  data: null,
  loading: true,
  error: null,
  setData: (data) => set({ data, loading: false, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error, loading: false })
}));

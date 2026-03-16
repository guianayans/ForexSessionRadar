import { create } from 'zustand';

interface TimelineUiState {
  overlapAlarmOverrides: Record<string, boolean>;
  setOverlapAlarmOverride: (eventId: string, enabled: boolean) => void;
  clearOverlapAlarmOverride: (eventId: string) => void;
}

export const useTimelineUiStore = create<TimelineUiState>((set) => ({
  overlapAlarmOverrides: {},
  setOverlapAlarmOverride: (eventId, enabled) =>
    set((state) => ({
      overlapAlarmOverrides: {
        ...state.overlapAlarmOverrides,
        [eventId]: enabled
      }
    })),
  clearOverlapAlarmOverride: (eventId) =>
    set((state) => {
      if (!(eventId in state.overlapAlarmOverrides)) {
        return state;
      }

      const next = { ...state.overlapAlarmOverrides };
      delete next[eventId];
      return { overlapAlarmOverrides: next };
    })
}));

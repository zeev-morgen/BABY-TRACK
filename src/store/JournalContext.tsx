import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { clearJournal, loadJournal, saveJournal } from '../lib/db';
import { uid } from '../lib/id';
import { createEmptyState, emptyMonth } from '../lib/state';
import { todayISO } from '../lib/date';
import type { Attachment, DomainKey, GrowthEntry, JournalState, MilestoneEntry, MonthEntry, Profile } from '../types';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface JournalContextValue {
  state: JournalState;
  loading: boolean;
  saveStatus: SaveStatus;
  saveError: string | null;
  monthEntry: (month: number) => MonthEntry;
  setProfile: (patch: Partial<Profile>) => void;
  setMonthDomain: (month: number, domain: DomainKey, value: string) => void;
  setMonthField: (month: number, field: 'specialMoment', value: string) => void;
  setMonthMedia: (month: number, field: 'photo' | 'audio', value: Attachment | null) => void;
  addAbility: (month: number, date?: string) => string;
  updateAbility: (month: number, id: string, patch: Partial<{ date: string; text: string }>) => void;
  removeAbility: (month: number, id: string) => void;
  setMilestone: (id: string, patch: Partial<MilestoneEntry>) => void;
  toggleMilestone: (id: string) => void;
  setGrowth: (id: string, patch: Partial<GrowthEntry>) => void;
  setGrowthNotes: (value: string) => void;
  replaceState: (next: JournalState) => void;
  resetAll: () => Promise<void>;
}

const JournalCtx = createContext<JournalContextValue | null>(null);

const SAVE_DEBOUNCE_MS = 500;

export function JournalProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<JournalState>(() => createEmptyState());
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const dirty = useRef(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    loadJournal()
      .then((stored) => {
        if (!alive) return;
        if (stored) setState(stored);
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // שמירה אוטומטית מושהית — כותבים רק אחרי שהמשתמש עצר להקליד.
  useEffect(() => {
    if (loading || !dirty.current) return;
    setSaveStatus('saving');
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      saveJournal(state)
        .then(() => {
          setSaveStatus('saved');
          setSaveError(null);
        })
        .catch((error: Error) => {
          setSaveStatus('error');
          setSaveError(error.message);
        });
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [state, loading]);

  const mutate = useCallback((recipe: (current: JournalState) => JournalState) => {
    dirty.current = true;
    setState((current) => ({ ...recipe(current), updatedAt: new Date().toISOString() }));
  }, []);

  const withMonth = useCallback(
    (month: number, recipe: (entry: MonthEntry) => MonthEntry) =>
      mutate((current) => {
        const key = String(month);
        const entry = current.months[key] ?? emptyMonth();
        return { ...current, months: { ...current.months, [key]: recipe(entry) } };
      }),
    [mutate],
  );

  const value = useMemo<JournalContextValue>(() => {
    return {
      state,
      loading,
      saveStatus,
      saveError,
      monthEntry: (month) => state.months[String(month)] ?? emptyMonth(),
      setProfile: (patch) => mutate((current) => ({ ...current, profile: { ...current.profile, ...patch } })),
      setMonthDomain: (month, domain, valueText) =>
        withMonth(month, (entry) => ({ ...entry, domains: { ...entry.domains, [domain]: valueText } })),
      setMonthField: (month, field, valueText) => withMonth(month, (entry) => ({ ...entry, [field]: valueText })),
      setMonthMedia: (month, field, media) => withMonth(month, (entry) => ({ ...entry, [field]: media })),
      addAbility: (month, date) => {
        const id = uid('ability');
        withMonth(month, (entry) => ({
          ...entry,
          abilities: [...entry.abilities, { id, date: date ?? todayISO(), text: '' }],
        }));
        return id;
      },
      updateAbility: (month, id, patch) =>
        withMonth(month, (entry) => ({
          ...entry,
          abilities: entry.abilities.map((ability) => (ability.id === id ? { ...ability, ...patch } : ability)),
        })),
      removeAbility: (month, id) =>
        withMonth(month, (entry) => ({
          ...entry,
          abilities: entry.abilities.filter((ability) => ability.id !== id),
        })),
      setMilestone: (id, patch) =>
        mutate((current) => ({
          ...current,
          milestones: {
            ...current.milestones,
            [id]: { ...(current.milestones[id] ?? { date: '', note: '' }), ...patch },
          },
        })),
      toggleMilestone: (id) =>
        mutate((current) => {
          const entry = current.milestones[id] ?? { date: '', note: '' };
          const next: MilestoneEntry = entry.date ? { ...entry, date: '' } : { ...entry, date: todayISO() };
          return { ...current, milestones: { ...current.milestones, [id]: next } };
        }),
      setGrowth: (id, patch) =>
        mutate((current) => ({
          ...current,
          growth: {
            ...current.growth,
            [id]: {
              ...(current.growth[id] ?? { date: '', weight: '', length: '', head: '', notes: '' }),
              ...patch,
            },
          },
        })),
      setGrowthNotes: (valueText) => mutate((current) => ({ ...current, growthNotes: valueText })),
      replaceState: (next) => mutate(() => next),
      resetAll: async () => {
        await clearJournal();
        dirty.current = false;
        setState(createEmptyState());
        setSaveStatus('idle');
        setSaveError(null);
      },
    };
  }, [state, loading, saveStatus, saveError, mutate, withMonth]);

  return <JournalCtx.Provider value={value}>{children}</JournalCtx.Provider>;
}

export function useJournal(): JournalContextValue {
  const ctx = useContext(JournalCtx);
  if (!ctx) throw new Error('useJournal must be used inside <JournalProvider>');
  return ctx;
}

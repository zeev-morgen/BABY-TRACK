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
import { todayISO } from '../lib/date';
import { uuid } from '../lib/id';
import { localRepo } from '../lib/repo/localRepo';
import { supabaseRepo } from '../lib/repo/supabaseRepo';
import { changeKey, type Change, type JournalRepo, type MediaTarget } from '../lib/repo/types';
import { createEmptyState, emptyMonth } from '../lib/state';
import { describeError, isCloudConfigured } from '../lib/supabase';
import type { Attachment, DomainKey, GrowthEntry, JournalState, MilestoneEntry, MonthEntry, Profile } from '../types';
import { useSession } from './SessionContext';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const SAVE_DEBOUNCE_MS = 600;

interface JournalContextValue {
  state: JournalState;
  loading: boolean;
  loadError: string | null;
  saveStatus: SaveStatus;
  saveError: string | null;
  monthEntry: (month: number) => MonthEntry;
  setProfile: (patch: Partial<Profile>) => void;
  setCoverPhoto: (value: Attachment | null) => Promise<void>;
  setMonthDomain: (month: number, domain: DomainKey, value: string) => void;
  setMonthField: (month: number, field: 'specialMoment', value: string) => void;
  setMonthMedia: (month: number, field: 'photo' | 'audio', value: Attachment | null) => Promise<void>;
  addAbility: (month: number, date?: string) => string;
  updateAbility: (month: number, id: string, patch: Partial<{ date: string; text: string }>) => void;
  removeAbility: (month: number, id: string) => void;
  setMilestone: (id: string, patch: Partial<MilestoneEntry>) => void;
  toggleMilestone: (id: string) => void;
  setGrowth: (id: string, patch: Partial<GrowthEntry>) => void;
  setGrowthNotes: (value: string) => void;
  replaceState: (next: JournalState) => void;
  resetAll: () => Promise<void>;
  reload: () => Promise<void>;
}

const JournalCtx = createContext<JournalContextValue | null>(null);

const repo: JournalRepo = isCloudConfigured ? supabaseRepo : localRepo;

export function JournalProvider({ children }: { children: ReactNode }) {
  const { journalId } = useSession();
  const [state, setState] = useState<JournalState>(() => createEmptyState());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  const latest = useRef(state);
  const queue = useRef(new Map<string, Change>());
  const timer = useRef<number | null>(null);
  const activeJournal = useRef<string | null>(journalId);

  useEffect(() => {
    latest.current = state;
  }, [state]);

  useEffect(() => {
    activeJournal.current = journalId;
  }, [journalId]);

  const flush = useCallback(async () => {
    const id = activeJournal.current;
    const changes = [...queue.current.values()];
    queue.current.clear();
    if (!id || changes.length === 0) return;

    try {
      for (const change of changes) {
        await repo.persist(id, change, latest.current);
      }
      setSaveStatus('saved');
      setSaveError(null);
    } catch (error) {
      setSaveStatus('error');
      setSaveError(describeError(error));
    }
  }, []);

  const enqueue = useCallback(
    (change: Change) => {
      if (!activeJournal.current) return;
      queue.current.set(changeKey(change), change);
      setSaveStatus('saving');
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(), SAVE_DEBOUNCE_MS);
    },
    [flush],
  );

  // כשעוזבים את הלשונית (או נועלים את הטלפון) שומרים מיד ולא מחכים להשהיה
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden' && queue.current.size > 0) {
        if (timer.current) window.clearTimeout(timer.current);
        void flush();
      }
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [flush]);

  const load = useCallback(async (id: string | null) => {
    if (!id) {
      setState(createEmptyState());
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const loaded = await repo.load(id);
      setState(loaded);
      setSaveStatus('idle');
    } catch (error) {
      setLoadError(describeError(error));
      setState(createEmptyState());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queue.current.clear();
    void load(journalId);
  }, [journalId, load]);

  const mutate = useCallback((recipe: (current: JournalState) => JournalState) => {
    setState((current) => {
      const next = { ...recipe(current), updatedAt: new Date().toISOString() };
      latest.current = next;
      return next;
    });
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

  /** מעלה מדיה חדשה, מוחקת את הקודמת, ומחזירה את הקובץ המצורף לשמירה במצב. */
  const swapMedia = useCallback(
    async (target: MediaTarget, previous: Attachment | null, next: Attachment | null): Promise<Attachment | null> => {
      const id = activeJournal.current;
      if (!id) return next;

      let stored = next;
      if (next && !next.path && repo.mode === 'cloud') {
        setSaveStatus('saving');
        stored = await repo.uploadMedia(id, target, next);
      }
      if (previous?.path && previous.path !== stored?.path) {
        await repo.removeMedia(id, previous).catch(() => undefined);
      }
      return stored;
    },
    [],
  );

  const value = useMemo<JournalContextValue>(
    () => ({
      state,
      loading,
      loadError,
      saveStatus,
      saveError,
      monthEntry: (month) => state.months[String(month)] ?? emptyMonth(),

      setProfile: (patch) => {
        mutate((current) => ({ ...current, profile: { ...current.profile, ...patch } }));
        enqueue({ kind: 'profile', patch });
      },

      setCoverPhoto: async (photo) => {
        try {
          const stored = await swapMedia({ kind: 'cover' }, state.profile.coverPhoto, photo);
          mutate((current) => ({ ...current, profile: { ...current.profile, coverPhoto: stored } }));
          enqueue({ kind: 'profile', patch: { coverPhoto: stored } });
        } catch (error) {
          setSaveStatus('error');
          setSaveError(describeError(error));
        }
      },

      setMonthDomain: (month, domain, text) => {
        withMonth(month, (entry) => ({ ...entry, domains: { ...entry.domains, [domain]: text } }));
        enqueue({ kind: 'month-domain', month, domain, value: text });
      },

      setMonthField: (month, field, text) => {
        withMonth(month, (entry) => ({ ...entry, [field]: text }));
        enqueue({ kind: 'month-moment', month, value: text });
      },

      setMonthMedia: async (month, field, media) => {
        try {
          const previous = (state.months[String(month)] ?? emptyMonth())[field];
          const target: MediaTarget = field === 'photo' ? { kind: 'photo', month } : { kind: 'audio', month };
          const stored = await swapMedia(target, previous, media);
          withMonth(month, (entry) => ({ ...entry, [field]: stored }));
          enqueue({ kind: 'month-media', month, field, value: stored });
        } catch (error) {
          setSaveStatus('error');
          setSaveError(describeError(error));
        }
      },

      addAbility: (month, date) => {
        const ability = { id: uuid(), date: date ?? todayISO(), text: '' };
        withMonth(month, (entry) => ({ ...entry, abilities: [...entry.abilities, ability] }));
        enqueue({ kind: 'ability-upsert', month, ability });
        return ability.id;
      },

      updateAbility: (month, id, patch) => {
        let updated = { id, date: '', text: '' };
        withMonth(month, (entry) => ({
          ...entry,
          abilities: entry.abilities.map((ability) => {
            if (ability.id !== id) return ability;
            updated = { ...ability, ...patch };
            return updated;
          }),
        }));
        enqueue({ kind: 'ability-upsert', month, ability: updated });
      },

      removeAbility: (month, id) => {
        withMonth(month, (entry) => ({ ...entry, abilities: entry.abilities.filter((a) => a.id !== id) }));
        enqueue({ kind: 'ability-delete', id });
      },

      setMilestone: (id, patch) => {
        mutate((current) => ({
          ...current,
          milestones: { ...current.milestones, [id]: { ...(current.milestones[id] ?? { date: '', note: '' }), ...patch } },
        }));
        enqueue({ kind: 'milestone', key: id, patch });
      },

      toggleMilestone: (id) => {
        const entry = state.milestones[id] ?? { date: '', note: '' };
        const patch: Partial<MilestoneEntry> = { date: entry.date ? '' : todayISO() };
        mutate((current) => ({
          ...current,
          milestones: { ...current.milestones, [id]: { ...(current.milestones[id] ?? { date: '', note: '' }), ...patch } },
        }));
        enqueue({ kind: 'milestone', key: id, patch });
      },

      setGrowth: (id, patch) => {
        mutate((current) => ({
          ...current,
          growth: {
            ...current.growth,
            [id]: { ...(current.growth[id] ?? { date: '', weight: '', length: '', head: '', notes: '' }), ...patch },
          },
        }));
        enqueue({ kind: 'growth', rowId: id, patch });
      },

      setGrowthNotes: (text) => {
        mutate((current) => ({ ...current, growthNotes: text }));
        enqueue({ kind: 'growth-notes', value: text });
      },

      replaceState: (next) => {
        mutate(() => next);
        enqueue({ kind: 'replace-all' });
      },

      resetAll: async () => {
        const id = activeJournal.current;
        queue.current.clear();
        if (id) await repo.clear(id);
        setState(createEmptyState());
        setSaveStatus('idle');
        setSaveError(null);
      },

      reload: async () => {
        await load(activeJournal.current);
      },
    }),
    [state, loading, loadError, saveStatus, saveError, mutate, withMonth, enqueue, swapMedia, load],
  );

  return <JournalCtx.Provider value={value}>{children}</JournalCtx.Provider>;
}

export function useJournal(): JournalContextValue {
  const ctx = useContext(JournalCtx);
  if (!ctx) throw new Error('useJournal must be used inside <JournalProvider>');
  return ctx;
}

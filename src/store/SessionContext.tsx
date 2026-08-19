import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { describeError, isCloudConfigured, supabase } from '../lib/supabase';
import { uuid } from '../lib/id';

export interface JournalSummary {
  id: string;
  name: string;
  birthDate: string;
  role: 'owner' | 'editor';
}

const LOCAL_JOURNAL: JournalSummary = { id: 'local', name: '', birthDate: '', role: 'owner' };
const SELECTED_KEY = 'baby-journal:selected';

interface SessionContextValue {
  mode: 'local' | 'cloud';
  ready: boolean;
  user: User | null;
  journals: JournalSummary[];
  journalId: string | null;
  currentJournal: JournalSummary | null;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  createJournal: (name: string, birthDate: string) => Promise<string>;
  joinJournal: (code: string) => Promise<string>;
  leaveJournal: (id: string) => Promise<void>;
  selectJournal: (id: string) => void;
  refreshJournals: () => Promise<void>;
}

const SessionCtx = createContext<SessionContextValue | null>(null);

function readSelected(): string | null {
  try {
    return localStorage.getItem(SELECTED_KEY);
  } catch {
    return null;
  }
}

function writeSelected(id: string | null): void {
  try {
    if (id) localStorage.setItem(SELECTED_KEY, id);
    else localStorage.removeItem(SELECTED_KEY);
  } catch {
    // בחירת היומן פשוט לא תיזכר בפעם הבאה
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!isCloudConfigured);
  const [user, setUser] = useState<User | null>(null);
  const [journals, setJournals] = useState<JournalSummary[]>(isCloudConfigured ? [] : [LOCAL_JOURNAL]);
  const [journalId, setJournalId] = useState<string | null>(isCloudConfigured ? null : LOCAL_JOURNAL.id);

  const loadJournals = useCallback(async (activeUser: User | null): Promise<JournalSummary[]> => {
    if (!supabase || !activeUser) return [];

    const { data, error } = await supabase
      .from('baby_members')
      .select('role, babies(id, name, birth_date)')
      .eq('user_id', activeUser.id);
    if (error) throw error;

    return (data ?? [])
      .map((row) => {
        const baby = (row as { babies: unknown }).babies as
          | { id: string; name: string | null; birth_date: string | null }
          | null;
        if (!baby) return null;
        return {
          id: baby.id,
          name: baby.name ?? '',
          birthDate: baby.birth_date ?? '',
          role: ((row as { role: string }).role === 'owner' ? 'owner' : 'editor') as 'owner' | 'editor',
        };
      })
      .filter((item): item is JournalSummary => item !== null)
      .sort((a, b) => a.name.localeCompare(b.name, 'he'));
  }, []);

  const syncJournals = useCallback(
    async (activeUser: User | null) => {
      const list = await loadJournals(activeUser);
      setJournals(list);
      setJournalId((current) => {
        const remembered = current ?? readSelected();
        const match = list.find((item) => item.id === remembered);
        const next = match?.id ?? list[0]?.id ?? null;
        writeSelected(next);
        return next;
      });
    },
    [loadJournals],
  );

  useEffect(() => {
    if (!supabase) return;

    let alive = true;

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!alive) return;
        const session = data.session as Session | null;
        setUser(session?.user ?? null);
        if (session?.user) await syncJournals(session.user);
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setReady(true);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (!nextUser) {
        setJournals([]);
        setJournalId(null);
        writeSelected(null);
        return;
      }
      void syncJournals(nextUser);
    });

    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, [syncJournals]);

  const value = useMemo<SessionContextValue>(() => {
    const currentJournal = journals.find((item) => item.id === journalId) ?? null;

    return {
      mode: isCloudConfigured ? 'cloud' : 'local',
      ready,
      user,
      journals,
      journalId,
      currentJournal,

      signUp: async (email, password, displayName) => {
        if (!supabase) throw new Error('אין חיבור לשרת');
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: displayName.trim() } },
        });
        if (error) throw new Error(describeError(error));
      },

      signIn: async (email, password) => {
        if (!supabase) throw new Error('אין חיבור לשרת');
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw new Error(describeError(error));
      },

      signOut: async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
        writeSelected(null);
      },

      createJournal: async (name, birthDate) => {
        if (!supabase || !user) throw new Error('צריך להתחבר');

        // המזהה נוצר כאן ולא בשרת בכוונה: אילו היינו מבקשים אותו חזרה עם
        // .select(), מדיניות הקריאה הייתה נבדקת לפני שה-trigger הספיק לרשום
        // אותנו כחברים ביומן, והבקשה הייתה חוזרת ריקה.
        const id = uuid();
        const { error } = await supabase
          .from('babies')
          .insert({ id, name: name.trim(), birth_date: birthDate || null, created_by: user.id });
        if (error) throw new Error(describeError(error));
        await syncJournals(user);
        setJournalId(id);
        writeSelected(id);
        return id;
      },

      joinJournal: async (code) => {
        if (!supabase || !user) throw new Error('צריך להתחבר');
        const { data, error } = await supabase.rpc('redeem_baby_invite', { p_code: code.trim() });
        if (error) throw new Error(describeError(error));
        const id = String(data);
        await syncJournals(user);
        setJournalId(id);
        writeSelected(id);
        return id;
      },

      leaveJournal: async (id) => {
        if (!supabase || !user) throw new Error('צריך להתחבר');
        const { error } = await supabase.from('baby_members').delete().eq('baby_id', id).eq('user_id', user.id);
        if (error) throw new Error(describeError(error));
        await syncJournals(user);
      },

      selectJournal: (id) => {
        setJournalId(id);
        writeSelected(id);
      },

      refreshJournals: async () => {
        await syncJournals(user);
      },
    };
  }, [ready, user, journals, journalId, syncJournals]);

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}

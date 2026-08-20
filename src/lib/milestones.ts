import { MILESTONES, MILESTONE_IDS } from '../data/milestones';
import type { JournalState } from '../types';

export interface ResolvedMilestone {
  key: string;
  label: string;
  emoji: string;
  hint: string;
  typical: [number, number] | null;
  /** אבן דרך שההורים הגדירו בעצמם, ולא אחת מ-18 הקבועות שביומן */
  custom: boolean;
}

/**
 * מאחד את אבני הדרך הקבועות מהיומן המודפס עם אלה שההורים הוסיפו.
 * כל מסך שמציג אבני דרך — הרשימה, ציר הזמן, ההדפסה והסטטיסטיקה —
 * עובד מול הרשימה המאוחדת הזו, כדי שאבן דרך משלכם תופיע בכולם.
 */
export function resolveMilestones(state: JournalState): ResolvedMilestone[] {
  const builtIn: ResolvedMilestone[] = MILESTONES.map((milestone) => ({
    key: milestone.id,
    label: milestone.label,
    emoji: milestone.emoji,
    hint: milestone.hint,
    typical: milestone.typical,
    custom: false,
  }));

  const custom: ResolvedMilestone[] = Object.entries(state.milestones)
    .filter(([key]) => !MILESTONE_IDS.includes(key))
    .map(([key, entry]) => ({
      key,
      label: entry.label?.trim() || 'אבן דרך משלנו',
      emoji: '✨',
      hint: '',
      typical: null,
      custom: true,
    }));

  return [...builtIn, ...custom];
}

export function isCustomMilestone(key: string): boolean {
  return !MILESTONE_IDS.includes(key);
}

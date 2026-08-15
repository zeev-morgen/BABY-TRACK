import { DOMAIN_KEYS } from '../data/domains';
import { GROWTH_ROWS } from '../data/growth';
import { MILESTONES } from '../data/milestones';
import { MONTH_NUMBERS } from '../data/months';
import type { JournalState, MonthEntry, TimelineItem } from '../types';
import { formatShort, isValidISO } from './date';

function filled(value: string): boolean {
  return value.trim().length > 0;
}

/** כמה "משבצות" בעמוד החודשי כבר מולאו (4 תחומים + יכולות + רגע מיוחד + תמונה). */
export function monthProgress(entry: MonthEntry | undefined): { done: number; total: number; ratio: number } {
  const total = DOMAIN_KEYS.length + 3;
  if (!entry) return { done: 0, total, ratio: 0 };

  let done = 0;
  for (const key of DOMAIN_KEYS) if (filled(entry.domains[key] ?? '')) done += 1;
  if (entry.abilities.some((a) => filled(a.text))) done += 1;
  if (filled(entry.specialMoment)) done += 1;
  if (entry.photo || entry.audio) done += 1;

  return { done, total, ratio: done / total };
}

export function isMonthStarted(entry: MonthEntry | undefined): boolean {
  return monthProgress(entry).done > 0;
}

export function milestonesDone(state: JournalState): number {
  return MILESTONES.filter((m) => isValidISO(state.milestones[m.id]?.date ?? '')).length;
}

export function growthRowsFilled(state: JournalState): number {
  return GROWTH_ROWS.filter((row) => {
    const entry = state.growth[row.id];
    return !!entry && (filled(entry.weight) || filled(entry.length) || filled(entry.head));
  }).length;
}

export function abilitiesCount(state: JournalState): number {
  return MONTH_NUMBERS.reduce(
    (sum, month) => sum + (state.months[String(month)]?.abilities.filter((a) => filled(a.text)).length ?? 0),
    0,
  );
}

export function photosCount(state: JournalState): number {
  const monthly = MONTH_NUMBERS.filter((month) => !!state.months[String(month)]?.photo).length;
  return monthly + (state.profile.coverPhoto ? 1 : 0);
}

/** אחוז מילוי כללי של היומן — 12 עמודים חודשיים + אבני דרך + גדילה. */
export function overallProgress(state: JournalState): number {
  const monthRatios = MONTH_NUMBERS.map((month) => monthProgress(state.months[String(month)]).ratio);
  const monthsPart = monthRatios.reduce((a, b) => a + b, 0) / MONTH_NUMBERS.length;
  const milestonesPart = milestonesDone(state) / MILESTONES.length;
  const growthPart = growthRowsFilled(state) / GROWTH_ROWS.length;
  return (monthsPart * 0.6 + milestonesPart * 0.25 + growthPart * 0.15) * 100;
}

/** מאחד את כל הרשומות המתוארכות לציר זמן אחד, מהחדש לישן. */
export function buildTimeline(state: JournalState): TimelineItem[] {
  const items: TimelineItem[] = [];

  if (isValidISO(state.profile.birthDate)) {
    items.push({
      id: 'birth',
      date: state.profile.birthDate,
      title: state.profile.babyName ? `${state.profile.babyName} נולד/ה` : 'יום הלידה',
      kind: 'birth',
      context: 'תחילת היומן',
      href: '#/profile',
    });
  }

  for (const milestone of MILESTONES) {
    const entry = state.milestones[milestone.id];
    if (entry && isValidISO(entry.date)) {
      items.push({
        id: `milestone-${milestone.id}`,
        date: entry.date,
        title: `${milestone.emoji} ${milestone.label}`,
        kind: 'milestone',
        context: entry.note.trim() || 'אבן דרך ראשונה',
        href: '#/milestones',
      });
    }
  }

  for (const month of MONTH_NUMBERS) {
    const entry = state.months[String(month)];
    if (!entry) continue;
    for (const ability of entry.abilities) {
      if (!filled(ability.text)) continue;
      items.push({
        id: `ability-${ability.id}`,
        date: isValidISO(ability.date) ? ability.date : '',
        title: ability.text.trim(),
        kind: 'ability',
        context: `יכולת חדשה · חודש ${month}`,
        href: `#/month/${month}`,
      });
    }
  }

  for (const row of GROWTH_ROWS) {
    const entry = state.growth[row.id];
    if (!entry || !isValidISO(entry.date)) continue;
    const measures = [
      entry.weight && `משקל ${entry.weight}`,
      entry.length && `אורך ${entry.length}`,
      entry.head && `היקף ראש ${entry.head}`,
    ].filter(Boolean);
    if (measures.length === 0) continue;
    items.push({
      id: `growth-${row.id}`,
      date: entry.date,
      title: `מדידה — ${row.label}`,
      kind: 'growth',
      context: measures.join(' · '),
      href: '#/growth',
    });
  }

  return items.sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.localeCompare(a.date);
  });
}

export function formatTimelineDate(iso: string): string {
  return iso ? formatShort(iso) : 'ללא תאריך';
}

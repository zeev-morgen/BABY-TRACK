export interface MonthMeta {
  month: number;
  title: string;
  subtitle: string;
}

const ORDINALS = [
  'הראשון',
  'השני',
  'השלישי',
  'הרביעי',
  'החמישי',
  'השישי',
  'השביעי',
  'השמיני',
  'התשיעי',
  'העשירי',
  'האחד עשר',
  'השנים עשר',
];

/** 12 העמודים החודשיים של היומן. */
export const MONTHS: MonthMeta[] = ORDINALS.map((ordinal, index) => ({
  month: index + 1,
  title: `חודש ${index + 1}`,
  subtitle: `החודש ${ordinal} לחיים`,
}));

export const MONTH_NUMBERS = MONTHS.map((m) => m.month);

export function monthMeta(month: number): MonthMeta {
  return MONTHS[month - 1] ?? MONTHS[0];
}

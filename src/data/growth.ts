export interface GrowthRowMeta {
  id: string;
  label: string;
  /** גיל בחודשים — משמש לסידור הגרף */
  ageMonths: number;
}

/** שורות טבלת "מעקב גדילה" מהיומן המודפס. */
export const GROWTH_ROWS: GrowthRowMeta[] = [
  { id: 'birth', label: 'לידה', ageMonths: 0 },
  { id: 'm1', label: 'חודש 1', ageMonths: 1 },
  { id: 'm2', label: 'חודש 2', ageMonths: 2 },
  { id: 'm3', label: 'חודש 3', ageMonths: 3 },
  { id: 'm4', label: 'חודש 4', ageMonths: 4 },
  { id: 'm6', label: 'חודש 6', ageMonths: 6 },
  { id: 'm9', label: 'חודש 9', ageMonths: 9 },
  { id: 'm12', label: 'חודש 12', ageMonths: 12 },
  { id: 'm18', label: 'חודש 18', ageMonths: 18 },
  { id: 'y2', label: 'שנתיים', ageMonths: 24 },
];

export const GROWTH_ROW_IDS = GROWTH_ROWS.map((r) => r.id);

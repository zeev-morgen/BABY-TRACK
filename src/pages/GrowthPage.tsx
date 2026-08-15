import { useMemo } from 'react';
import { GROWTH_ROWS } from '../data/growth';
import { parseLengthCm, parseWeightKg } from '../lib/measure';
import { useJournal } from '../store/JournalContext';
import { AutoTextarea } from '../components/fields';
import { GrowthChart, type ChartPoint } from '../components/GrowthChart';

const COLUMNS: { key: 'weight' | 'length' | 'head'; label: string; placeholder: string }[] = [
  { key: 'weight', label: 'משקל', placeholder: '3.240 ק״ג' },
  { key: 'length', label: 'אורך', placeholder: '50 ס״מ' },
  { key: 'head', label: 'היקף ראש', placeholder: '35 ס״מ' },
];

export function GrowthPage() {
  const { state, setGrowth, setGrowthNotes } = useJournal();

  const series = useMemo(() => {
    const weight: ChartPoint[] = [];
    const length: ChartPoint[] = [];
    const head: ChartPoint[] = [];

    for (const row of GROWTH_ROWS) {
      const entry = state.growth[row.id];
      if (!entry) continue;

      const w = parseWeightKg(entry.weight);
      if (w !== null) weight.push({ x: row.ageMonths, y: w, label: `${w} ק״ג` });

      const l = parseLengthCm(entry.length);
      if (l !== null) length.push({ x: row.ageMonths, y: l, label: `${l} ס״מ` });

      const h = parseLengthCm(entry.head);
      if (h !== null) head.push({ x: row.ageMonths, y: h, label: `${h} ס״מ` });
    }

    return { weight, length, head };
  }, [state.growth]);

  const hasAnyData = series.weight.length + series.length.length + series.head.length > 0;

  return (
    <div>
      <div className="page-head">
        <div className="page-head__eyebrow">מעקב גדילה</div>
        <h1>משקל, אורך והיקף ראש</h1>
        <p>
          מלאו את המדידות מהביקורים בטיפת חלב. אפשר לכתוב בכל צורה שנוחה לכם — "3.240 ק״ג", "3240" או "3.24" יובנו
          כמשקל זהה.
        </p>
      </div>

      <div className="table-wrap">
        <table className="growth">
          <caption className="sr-only">טבלת מעקב גדילה לפי גיל</caption>
          <thead>
            <tr>
              <th scope="col">גיל</th>
              <th scope="col">תאריך</th>
              {COLUMNS.map((column) => (
                <th scope="col" key={column.key}>
                  {column.label}
                </th>
              ))}
              <th scope="col">הערות</th>
            </tr>
          </thead>
          <tbody>
            {GROWTH_ROWS.map((row) => {
              const entry = state.growth[row.id] ?? { date: '', weight: '', length: '', head: '', notes: '' };
              return (
                <tr key={row.id}>
                  <td className="row-label">{row.label}</td>
                  <td>
                    <input
                      className="input"
                      type="date"
                      value={entry.date}
                      aria-label={`תאריך המדידה — ${row.label}`}
                      onChange={(event) => setGrowth(row.id, { date: event.target.value })}
                    />
                  </td>
                  {COLUMNS.map((column) => (
                    <td key={column.key}>
                      <input
                        className="input"
                        type="text"
                        inputMode="decimal"
                        value={entry[column.key]}
                        placeholder={row.id === 'birth' ? column.placeholder : ''}
                        aria-label={`${column.label} — ${row.label}`}
                        onChange={(event) => setGrowth(row.id, { [column.key]: event.target.value })}
                      />
                    </td>
                  ))}
                  <td>
                    <input
                      className="input"
                      type="text"
                      value={entry.notes}
                      placeholder="—"
                      aria-label={`הערות — ${row.label}`}
                      onChange={(event) => setGrowth(row.id, { notes: event.target.value })}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2 className="section-title">עקומות הגדילה</h2>
      {hasAnyData ? (
        <>
          <GrowthChart title="משקל" unit="ק״ג" color="var(--chart-weight)" points={series.weight} />
          <GrowthChart title="אורך" unit="ס״מ" color="var(--chart-length)" points={series.length} />
          <GrowthChart title="היקף ראש" unit="ס״מ" color="var(--chart-head)" points={series.head} />
        </>
      ) : (
        <div className="card">
          <p className="muted small">אחרי המדידה הראשונה שתמלאו, יופיעו כאן שלושה גרפים — אחד לכל מדד.</p>
        </div>
      )}

      <h2 className="section-title">הערות נוספות</h2>
      <div className="card">
        <AutoTextarea
          ariaLabel="הערות נוספות למעקב הגדילה"
          value={state.growthNotes}
          onChange={setGrowthNotes}
          placeholder="למשל: התחלנו מזון משלים בגיל חצי שנה, שינוי בתיאבון, מה אמרו בטיפת חלב"
        />
      </div>

      <p className="notice" style={{ marginTop: 14 }}>
        ℹ️ הגרפים כאן מראים את הקצב האישי של התינוק/ת שלכם בלבד ואינם עקומות אחוזונים. את ההשוואה לעקומות התקן עושים
        בטיפת חלב או אצל רופא/ת הילדים.
      </p>
    </div>
  );
}

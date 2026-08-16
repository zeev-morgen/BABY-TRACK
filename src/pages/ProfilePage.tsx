import { ageBreakdown, currentJournalMonth, formatLong, todayISO } from '../lib/date';
import { COPY } from '../lib/copy';
import { Link } from '../lib/router';
import { useJournal } from '../store/JournalContext';
import { TextInput } from '../components/fields';
import { MediaPicker } from '../components/MediaPicker';

export function ProfilePage() {
  const { state, setProfile, setCoverPhoto } = useJournal();
  const { profile } = state;
  const age = ageBreakdown(profile.birthDate);
  const current = currentJournalMonth(profile.birthDate);
  const futureBirth = profile.birthDate !== '' && profile.birthDate > todayISO();

  return (
    <div>
      <div className="page-head">
        <div className="page-head__eyebrow">עמוד השער</div>
        <h1>פרטי התינוק/ת</h1>
        <p>הפרטים האלה מופיעים בכותרת היומן, ומהם מחושבים הגיל וטווחי התאריכים של כל חודש.</p>
      </div>

      <div className="card">
        <div className="field-row">
          <TextInput
            id="baby-name"
            label="שם התינוק/ת"
            value={profile.babyName}
            onChange={(value) => setProfile({ babyName: value })}
            placeholder="למשל: מעיין"
          />
          <TextInput
            id="birth-date"
            label="תאריך לידה"
            type="date"
            max={todayISO()}
            value={profile.birthDate}
            onChange={(value) => setProfile({ birthDate: value })}
          />
        </div>

        <div className="field-row">
          <TextInput
            id="birth-weight"
            label="משקל בלידה"
            value={profile.birthWeight}
            onChange={(value) => setProfile({ birthWeight: value })}
            placeholder="למשל: 3.240 ק״ג"
          />
          <TextInput
            id="birth-length"
            label="אורך בלידה"
            value={profile.birthLength}
            onChange={(value) => setProfile({ birthLength: value })}
            placeholder="למשל: 50 ס״מ"
          />
        </div>

        <TextInput
          id="author"
          label="היומן נכתב על ידי"
          value={profile.author}
          onChange={(value) => setProfile({ author: value })}
          placeholder="למשל: אמא ואבא"
          hint="השם שיופיע בעמוד השער של היומן המודפס"
        />

        {futureBirth ? (
          <p className="notice notice--warn">תאריך הלידה שהוזן עדיין לא הגיע — בדקו שהוא נכון כדי שהגיל יחושב כמו שצריך.</p>
        ) : null}

        {age ? (
          <p className="notice notice--ok">
            {profile.babyName.trim() || 'התינוק/ת'} נולד/ה ב־{formatLong(profile.birthDate)} · גיל היום: {age.text}
            {current ? (
              <>
                {' '}
                · אתם בעמוד של <Link to={`/month/${current}`}>חודש {current}</Link>
              </>
            ) : null}
          </p>
        ) : null}
      </div>

      <div className="card">
        <div className="card__head">
          <div className="card__emoji" aria-hidden="true">
            🖼️
          </div>
          <div>
            <h2 className="card__title">התמונה הראשונה</h2>
            <p className="card__sub">התמונה שתופיע בראש היומן ובעמוד השער בהדפסה</p>
          </div>
        </div>
        <MediaPicker
          kind="image"
          label="בחירת תמונה"
          hint={COPY.storageShort}
          value={profile.coverPhoto}
          onChange={(value) => setCoverPhoto(value)}
        />
      </div>

      <p className="notice" style={{ marginTop: 14 }}>
        🔒 {COPY.profilePrivacy} <Link to="/settings">לייצוא גיבוי</Link>.
      </p>
    </div>
  );
}

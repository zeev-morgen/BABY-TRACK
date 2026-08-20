import { DOMAIN_KEYS } from '../../data/domains';
import { GROWTH_ROW_IDS } from '../../data/growth';
import { MILESTONE_IDS } from '../../data/milestones';
import { MONTH_NUMBERS } from '../../data/months';
import type { Attachment, DomainKey, JournalState } from '../../types';
import { requireSupabase } from '../supabase';
import { createEmptyState, emptyMonth } from '../state';
import { dataUrlBytes } from '../media';
import type { Change, JournalRepo, MediaTarget } from './types';

const BUCKET = 'journal-media';
const SIGNED_URL_TTL = 60 * 60 * 8; // 8 שעות — מספיק לישיבת עבודה אחת

/** עמודות התחומים בטבלה נקראות בדיוק כמו המפתחות בקוד. */
const DOMAIN_COLUMN: Record<DomainKey, string> = {
  motor: 'motor',
  language: 'language',
  social: 'social',
  cognitive: 'cognitive',
};

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** תאריכים נשמרים ב-Postgres כ-date, וריק נשמר כ-null. */
function dateOrNull(value: string | undefined): string | null {
  return value && value.trim() ? value : null;
}

async function signedUrl(path: string | null | undefined): Promise<Attachment | null> {
  if (!path) return null;
  const client = requireSupabase();
  const { data, error } = await client.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
  if (error || !data?.signedUrl) return null;
  return {
    dataUrl: data.signedUrl,
    name: path.split('/').pop() ?? 'file',
    size: 0,
    path,
  };
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

function extensionFor(attachment: Attachment, fallback: string): string {
  const fromName = attachment.name.includes('.') ? attachment.name.split('.').pop() : null;
  if (fromName && /^[a-z0-9]{1,5}$/i.test(fromName)) return fromName.toLowerCase();
  return fallback;
}

export const supabaseRepo: JournalRepo = {
  mode: 'cloud',

  async load(journalId: string): Promise<JournalState> {
    const client = requireSupabase();
    const state = createEmptyState();

    const [baby, months, abilities, milestones, growth] = await Promise.all([
      client.from('babies').select('*').eq('id', journalId).single(),
      client.from('month_entries').select('*').eq('baby_id', journalId),
      client.from('abilities').select('*').eq('baby_id', journalId).order('created_at'),
      client.from('milestones').select('*').eq('baby_id', journalId),
      client.from('growth_entries').select('*').eq('baby_id', journalId),
    ]);

    if (baby.error) throw baby.error;
    if (months.error) throw months.error;
    if (abilities.error) throw abilities.error;
    if (milestones.error) throw milestones.error;
    if (growth.error) throw growth.error;

    const row = baby.data as Record<string, unknown>;
    state.profile = {
      babyName: text(row.name),
      birthDate: text(row.birth_date),
      birthWeight: text(row.birth_weight),
      birthLength: text(row.birth_length),
      author: text(row.author),
      coverPhoto: await signedUrl(row.cover_photo_path as string | null),
    };
    state.growthNotes = text(row.growth_notes);
    state.updatedAt = text(row.updated_at) || new Date().toISOString();

    for (const month of MONTH_NUMBERS) state.months[String(month)] = emptyMonth();

    for (const monthRow of (months.data ?? []) as Record<string, unknown>[]) {
      const month = Number(monthRow.month);
      if (!MONTH_NUMBERS.includes(month)) continue;
      const entry = emptyMonth();
      for (const domain of DOMAIN_KEYS) entry.domains[domain] = text(monthRow[DOMAIN_COLUMN[domain]]);
      entry.specialMoment = text(monthRow.special_moment);
      entry.photo = await signedUrl(monthRow.photo_path as string | null);
      entry.audio = await signedUrl(monthRow.audio_path as string | null);
      state.months[String(month)] = entry;
    }

    for (const abilityRow of (abilities.data ?? []) as Record<string, unknown>[]) {
      const month = Number(abilityRow.month);
      const entry = state.months[String(month)];
      if (!entry) continue;
      entry.abilities.push({
        id: String(abilityRow.id),
        date: text(abilityRow.happened_on),
        text: text(abilityRow.description),
      });
    }

    for (const id of MILESTONE_IDS) state.milestones[id] = { date: '', note: '' };
    for (const milestoneRow of (milestones.data ?? []) as Record<string, unknown>[]) {
      const key = String(milestoneRow.key);
      const label = text(milestoneRow.label).trim();
      // מפתח שאינו ברשימה הקבועה הוא אבן דרך של ההורים, ובלי כותרת אין מה להציג
      if (!MILESTONE_IDS.includes(key) && !label) continue;
      state.milestones[key] = {
        date: text(milestoneRow.happened_on),
        note: text(milestoneRow.note),
        ...(label ? { label } : {}),
      };
    }

    for (const id of GROWTH_ROW_IDS) state.growth[id] = { date: '', weight: '', length: '', head: '', notes: '' };
    for (const growthRow of (growth.data ?? []) as Record<string, unknown>[]) {
      const rowId = String(growthRow.row_id);
      if (!GROWTH_ROW_IDS.includes(rowId)) continue;
      state.growth[rowId] = {
        date: text(growthRow.measured_on),
        weight: text(growthRow.weight),
        length: text(growthRow.length),
        head: text(growthRow.head),
        notes: text(growthRow.notes),
      };
    }

    return state;
  },

  async persist(journalId: string, change: Change, nextState: JournalState): Promise<void> {
    const client = requireSupabase();

    switch (change.kind) {
      case 'profile': {
        const patch: Record<string, unknown> = {};
        const p = change.patch;
        if ('babyName' in p) patch.name = p.babyName;
        if ('birthDate' in p) patch.birth_date = dateOrNull(p.birthDate);
        if ('birthWeight' in p) patch.birth_weight = p.birthWeight;
        if ('birthLength' in p) patch.birth_length = p.birthLength;
        if ('author' in p) patch.author = p.author;
        if ('coverPhoto' in p) patch.cover_photo_path = p.coverPhoto?.path ?? null;
        if (Object.keys(patch).length === 0) return;
        patch.updated_at = new Date().toISOString();
        const { error } = await client.from('babies').update(patch).eq('id', journalId);
        if (error) throw error;
        return;
      }

      case 'month-domain': {
        const { error } = await client.from('month_entries').upsert(
          {
            baby_id: journalId,
            month: change.month,
            [DOMAIN_COLUMN[change.domain]]: change.value,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'baby_id,month' },
        );
        if (error) throw error;
        return;
      }

      case 'month-moment': {
        const { error } = await client.from('month_entries').upsert(
          {
            baby_id: journalId,
            month: change.month,
            special_moment: change.value,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'baby_id,month' },
        );
        if (error) throw error;
        return;
      }

      case 'month-media': {
        const column = change.field === 'photo' ? 'photo_path' : 'audio_path';
        const { error } = await client.from('month_entries').upsert(
          {
            baby_id: journalId,
            month: change.month,
            [column]: change.value?.path ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'baby_id,month' },
        );
        if (error) throw error;
        return;
      }

      case 'ability-upsert': {
        const { error } = await client.from('abilities').upsert({
          id: change.ability.id,
          baby_id: journalId,
          month: change.month,
          happened_on: dateOrNull(change.ability.date),
          description: change.ability.text,
        });
        if (error) throw error;
        return;
      }

      case 'ability-delete': {
        const { error } = await client.from('abilities').delete().eq('id', change.id).eq('baby_id', journalId);
        if (error) throw error;
        return;
      }

      case 'milestone': {
        const current = nextState.milestones[change.key] ?? { date: '', note: '' };
        const { error } = await client.from('milestones').upsert(
          {
            baby_id: journalId,
            key: change.key,
            happened_on: dateOrNull(current.date),
            note: current.note,
            label: current.label ?? '',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'baby_id,key' },
        );
        if (error) throw error;
        return;
      }

      case 'milestone-delete': {
        const { error } = await client
          .from('milestones')
          .delete()
          .eq('baby_id', journalId)
          .eq('key', change.key);
        if (error) throw error;
        return;
      }

      case 'growth': {
        const current = nextState.growth[change.rowId] ?? { date: '', weight: '', length: '', head: '', notes: '' };
        const { error } = await client.from('growth_entries').upsert(
          {
            baby_id: journalId,
            row_id: change.rowId,
            measured_on: dateOrNull(current.date),
            weight: current.weight,
            length: current.length,
            head: current.head,
            notes: current.notes,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'baby_id,row_id' },
        );
        if (error) throw error;
        return;
      }

      case 'growth-notes': {
        const { error } = await client
          .from('babies')
          .update({ growth_notes: change.value, updated_at: new Date().toISOString() })
          .eq('id', journalId);
        if (error) throw error;
        return;
      }

      case 'replace-all': {
        await writeWholeJournal(journalId, nextState);
        return;
      }
    }
  },

  async uploadMedia(journalId: string, target: MediaTarget, attachment: Attachment): Promise<Attachment> {
    const client = requireSupabase();
    const blob = await dataUrlToBlob(attachment.dataUrl);

    const folder =
      target.kind === 'cover' ? 'cover' : `month-${String(target.month).padStart(2, '0')}/${target.kind}`;
    const extension = extensionFor(attachment, target.kind === 'audio' ? 'm4a' : 'jpg');
    const path = `${journalId}/${folder}/${Date.now()}.${extension}`;

    const { error } = await client.storage.from(BUCKET).upload(path, blob, {
      contentType: blob.type || (target.kind === 'audio' ? 'audio/mpeg' : 'image/jpeg'),
      upsert: true,
    });
    if (error) throw error;

    const signed = await signedUrl(path);
    return {
      dataUrl: signed?.dataUrl ?? attachment.dataUrl,
      name: attachment.name,
      size: attachment.size || dataUrlBytes(attachment.dataUrl),
      path,
    };
  },

  async removeMedia(_journalId: string, attachment: Attachment): Promise<void> {
    if (!attachment.path) return;
    const client = requireSupabase();
    await client.storage.from(BUCKET).remove([attachment.path]);
  },

  async clear(journalId: string): Promise<void> {
    const client = requireSupabase();
    const { data } = await client.storage.from(BUCKET).list(journalId, { limit: 1000 });
    if (data && data.length > 0) {
      await client.storage.from(BUCKET).remove(data.map((file) => `${journalId}/${file.name}`));
    }
    await Promise.all([
      client.from('month_entries').delete().eq('baby_id', journalId),
      client.from('abilities').delete().eq('baby_id', journalId),
      client.from('milestones').delete().eq('baby_id', journalId),
      client.from('growth_entries').delete().eq('baby_id', journalId),
    ]);
    await client
      .from('babies')
      .update({ growth_notes: '', cover_photo_path: null, updated_at: new Date().toISOString() })
      .eq('id', journalId);
  },
};

/** כתיבה מלאה — משמשת רק בייבוא קובץ גיבוי. */
async function writeWholeJournal(journalId: string, state: JournalState): Promise<void> {
  const client = requireSupabase();

  const { error: babyError } = await client
    .from('babies')
    .update({
      name: state.profile.babyName,
      birth_date: dateOrNull(state.profile.birthDate),
      birth_weight: state.profile.birthWeight,
      birth_length: state.profile.birthLength,
      author: state.profile.author,
      cover_photo_path: state.profile.coverPhoto?.path ?? null,
      growth_notes: state.growthNotes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', journalId);
  if (babyError) throw babyError;

  const monthRows = MONTH_NUMBERS.map((month) => {
    const entry = state.months[String(month)] ?? emptyMonth();
    return {
      baby_id: journalId,
      month,
      motor: entry.domains.motor,
      language: entry.domains.language,
      social: entry.domains.social,
      cognitive: entry.domains.cognitive,
      special_moment: entry.specialMoment,
      photo_path: entry.photo?.path ?? null,
      audio_path: entry.audio?.path ?? null,
      updated_at: new Date().toISOString(),
    };
  });
  const { error: monthError } = await client.from('month_entries').upsert(monthRows, { onConflict: 'baby_id,month' });
  if (monthError) throw monthError;

  await client.from('abilities').delete().eq('baby_id', journalId);
  const abilityRows = MONTH_NUMBERS.flatMap((month) =>
    (state.months[String(month)]?.abilities ?? [])
      .filter((ability) => ability.text.trim() || ability.date)
      .map((ability) => ({
        baby_id: journalId,
        month,
        happened_on: dateOrNull(ability.date),
        description: ability.text,
      })),
  );
  if (abilityRows.length > 0) {
    const { error } = await client.from('abilities').insert(abilityRows);
    if (error) throw error;
  }

  const milestoneRows = Object.entries(state.milestones).map(([key, entry]) => ({
    baby_id: journalId,
    key,
    happened_on: dateOrNull(entry.date),
    note: entry.note,
    label: entry.label ?? '',
    updated_at: new Date().toISOString(),
  }));
  const { error: milestoneError } = await client
    .from('milestones')
    .upsert(milestoneRows, { onConflict: 'baby_id,key' });
  if (milestoneError) throw milestoneError;

  const growthRows = GROWTH_ROW_IDS.map((rowId) => {
    const entry = state.growth[rowId] ?? { date: '', weight: '', length: '', head: '', notes: '' };
    return {
      baby_id: journalId,
      row_id: rowId,
      measured_on: dateOrNull(entry.date),
      weight: entry.weight,
      length: entry.length,
      head: entry.head,
      notes: entry.notes,
      updated_at: new Date().toISOString(),
    };
  });
  const { error: growthError } = await client
    .from('growth_entries')
    .upsert(growthRows, { onConflict: 'baby_id,row_id' });
  if (growthError) throw growthError;
}

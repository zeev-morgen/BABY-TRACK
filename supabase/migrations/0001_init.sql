-- ============================================================================
-- יומן התפתחות תינוק — סכימה ראשונית ל-Supabase
--
-- להרצה: Supabase Dashboard → SQL Editor → הדבקה → Run.
-- הקובץ בטוח להרצה חוזרת (idempotent).
--
-- מודל ההרשאות: כל הנתונים שייכים ל"יומן" (baby), ומי שרשאי לגשת אליו
-- מופיע ב-baby_members. כל מדיניות ה-RLS נשענת על is_baby_member(),
-- כך שאין דרך לקרוא או לכתוב יומן של מישהו אחר גם אם יודעים את המזהה שלו.
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================== טבלאות ======================================

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text        not null default '',
  created_at   timestamptz not null default now()
);

create table if not exists public.babies (
  id               uuid primary key default gen_random_uuid(),
  name             text        not null default '',
  birth_date       date,
  birth_weight     text        not null default '',
  birth_length     text        not null default '',
  author           text        not null default '',
  cover_photo_path text,
  growth_notes     text        not null default '',
  created_by       uuid        not null references auth.users (id) on delete cascade,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.baby_members (
  baby_id    uuid        not null references public.babies (id) on delete cascade,
  user_id    uuid        not null references auth.users (id) on delete cascade,
  role       text        not null default 'editor' check (role in ('owner', 'editor')),
  created_at timestamptz not null default now(),
  primary key (baby_id, user_id)
);

create index if not exists baby_members_user_idx on public.baby_members (user_id);

create table if not exists public.baby_invites (
  code       text primary key,
  baby_id    uuid        not null references public.babies (id) on delete cascade,
  created_by uuid        not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  used_by    uuid        references auth.users (id),
  used_at    timestamptz
);

create index if not exists baby_invites_baby_idx on public.baby_invites (baby_id);

-- עמוד חודשי: ארבעת התחומים, רגע מיוחד, ונתיבי המדיה ב-Storage
create table if not exists public.month_entries (
  baby_id        uuid        not null references public.babies (id) on delete cascade,
  month          int         not null check (month between 1 and 12),
  motor          text        not null default '',
  language       text        not null default '',
  social         text        not null default '',
  cognitive      text        not null default '',
  special_moment text        not null default '',
  photo_path     text,
  audio_path     text,
  updated_at     timestamptz not null default now(),
  primary key (baby_id, month)
);

create table if not exists public.abilities (
  id          uuid primary key default gen_random_uuid(),
  baby_id     uuid        not null references public.babies (id) on delete cascade,
  month       int         not null check (month between 1 and 12),
  happened_on date,
  description text        not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists abilities_baby_month_idx on public.abilities (baby_id, month);

create table if not exists public.milestones (
  baby_id     uuid        not null references public.babies (id) on delete cascade,
  key         text        not null,
  happened_on date,
  note        text        not null default '',
  updated_at  timestamptz not null default now(),
  primary key (baby_id, key)
);

create table if not exists public.growth_entries (
  baby_id     uuid        not null references public.babies (id) on delete cascade,
  row_id      text        not null,
  measured_on date,
  weight      text        not null default '',
  length      text        not null default '',
  head        text        not null default '',
  notes       text        not null default '',
  updated_at  timestamptz not null default now(),
  primary key (baby_id, row_id)
);

-- ============================== פונקציות ====================================

-- בדיקת חברות ביומן.
-- security definer במכוון: בלי זה, מדיניות RLS על baby_members הייתה
-- מפעילה את עצמה שוב ושוב (רקורסיה אינסופית).
create or replace function public.is_baby_member(p_baby_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.baby_members m
     where m.baby_id = p_baby_id
       and m.user_id = auth.uid()
  );
$$;

-- פרופיל נוצר אוטומטית עם ההרשמה
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- מי שיוצר יומן הופך אוטומטית לבעלים שלו
create or replace function public.handle_new_baby()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.baby_members (baby_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_baby_created on public.babies;
create trigger on_baby_created
  after insert on public.babies
  for each row execute function public.handle_new_baby();

-- יצירת קוד הזמנה להורה השני
create or replace function public.create_baby_invite(p_baby_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'צריך להתחבר כדי ליצור קוד הזמנה';
  end if;

  if not public.is_baby_member(p_baby_id) then
    raise exception 'אין לך גישה ליומן הזה';
  end if;

  -- 8 תווים הקסדצימליים מתוך UUID.
  -- במכוון לא משתמשים ב-gen_random_bytes של pgcrypto: היא יושבת בסכימת
  -- extensions ולא נמצאת ב-search_path של הפונקציה הזו. gen_random_uuid
  -- לעומתה היא פונקציית ליבה של Postgres וזמינה תמיד.
  for i in 1 .. 5 loop
    v_code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8));
    begin
      insert into public.baby_invites (code, baby_id, created_by)
      values (v_code, p_baby_id, auth.uid());
      return v_code;
    exception
      when unique_violation then
        null; -- קוד תפוס, מנסים אחד אחר
    end;
  end loop;

  raise exception 'לא הצלחנו לייצר קוד הזמנה פנוי, נסו שוב';
end;
$$;

-- מימוש קוד הזמנה — מצרף את המשתמש הנוכחי ליומן
create or replace function public.redeem_baby_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.baby_invites;
begin
  if auth.uid() is null then
    raise exception 'צריך להתחבר כדי להצטרף ליומן';
  end if;

  select * into v_invite
    from public.baby_invites
   where code = upper(trim(p_code));

  if v_invite is null then
    raise exception 'קוד ההזמנה לא נמצא';
  end if;

  if v_invite.used_at is not null then
    raise exception 'כבר נעשה שימוש בקוד הזה';
  end if;

  if v_invite.expires_at < now() then
    raise exception 'תוקף הקוד פג — בקשו קוד חדש';
  end if;

  insert into public.baby_members (baby_id, user_id, role)
  values (v_invite.baby_id, auth.uid(), 'editor')
  on conflict (baby_id, user_id) do nothing;

  update public.baby_invites
     set used_by = auth.uid(),
         used_at = now()
   where code = v_invite.code;

  return v_invite.baby_id;
end;
$$;

-- שמות התצוגה של שאר החברים ביומן (בלי לחשוף את טבלת המשתמשים)
create or replace function public.baby_member_names(p_baby_id uuid)
returns table (user_id uuid, display_name text, role text, joined_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select m.user_id,
         coalesce(nullif(p.display_name, ''), 'הורה') as display_name,
         m.role,
         m.created_at
    from public.baby_members m
    left join public.profiles p on p.id = m.user_id
   where m.baby_id = p_baby_id
     and public.is_baby_member(p_baby_id)
   order by m.created_at;
$$;

-- ============================== RLS =========================================

alter table public.profiles       enable row level security;
alter table public.babies         enable row level security;
alter table public.baby_members   enable row level security;
alter table public.baby_invites   enable row level security;
alter table public.month_entries  enable row level security;
alter table public.abilities      enable row level security;
alter table public.milestones     enable row level security;
alter table public.growth_entries enable row level security;

drop policy if exists "profiles: read own"   on public.profiles;
drop policy if exists "profiles: write own"  on public.profiles;
create policy "profiles: read own"  on public.profiles for select using (id = auth.uid());
create policy "profiles: write own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "babies: members read"   on public.babies;
drop policy if exists "babies: create own"     on public.babies;
drop policy if exists "babies: members update" on public.babies;
drop policy if exists "babies: owner delete"   on public.babies;
create policy "babies: members read"   on public.babies for select using (public.is_baby_member(id));
create policy "babies: create own"     on public.babies for insert with check (created_by = auth.uid());
create policy "babies: members update" on public.babies for update using (public.is_baby_member(id)) with check (public.is_baby_member(id));
create policy "babies: owner delete"   on public.babies for delete using (created_by = auth.uid());

drop policy if exists "members: read"       on public.baby_members;
drop policy if exists "members: leave"      on public.baby_members;
create policy "members: read"  on public.baby_members for select using (public.is_baby_member(baby_id));
-- הצטרפות נעשית רק דרך redeem_baby_invite; אפשר תמיד לעזוב יומן
create policy "members: leave" on public.baby_members for delete using (user_id = auth.uid());

drop policy if exists "invites: members read" on public.baby_invites;
create policy "invites: members read" on public.baby_invites for select using (public.is_baby_member(baby_id));

-- טבלאות התוכן: אותה מדיניות בדיוק לכולן
drop policy if exists "months: members all" on public.month_entries;
create policy "months: members all" on public.month_entries for all
  using (public.is_baby_member(baby_id)) with check (public.is_baby_member(baby_id));

drop policy if exists "abilities: members all" on public.abilities;
create policy "abilities: members all" on public.abilities for all
  using (public.is_baby_member(baby_id)) with check (public.is_baby_member(baby_id));

drop policy if exists "milestones: members all" on public.milestones;
create policy "milestones: members all" on public.milestones for all
  using (public.is_baby_member(baby_id)) with check (public.is_baby_member(baby_id));

drop policy if exists "growth: members all" on public.growth_entries;
create policy "growth: members all" on public.growth_entries for all
  using (public.is_baby_member(baby_id)) with check (public.is_baby_member(baby_id));

-- ============================== Storage =====================================

insert into storage.buckets (id, name, public)
values ('journal-media', 'journal-media', false)
on conflict (id) do nothing;

-- נתיב הקובץ תמיד מתחיל במזהה היומן: <baby_id>/<שאר הנתיב>
drop policy if exists "media: members read"   on storage.objects;
drop policy if exists "media: members write"  on storage.objects;
drop policy if exists "media: members update" on storage.objects;
drop policy if exists "media: members delete" on storage.objects;

create policy "media: members read" on storage.objects for select
  using (
    bucket_id = 'journal-media'
    and public.is_baby_member(nullif((storage.foldername(name))[1], '')::uuid)
  );

create policy "media: members write" on storage.objects for insert
  with check (
    bucket_id = 'journal-media'
    and public.is_baby_member(nullif((storage.foldername(name))[1], '')::uuid)
  );

create policy "media: members update" on storage.objects for update
  using (
    bucket_id = 'journal-media'
    and public.is_baby_member(nullif((storage.foldername(name))[1], '')::uuid)
  );

create policy "media: members delete" on storage.objects for delete
  using (
    bucket_id = 'journal-media'
    and public.is_baby_member(nullif((storage.foldername(name))[1], '')::uuid)
  );

-- ============================================================================
-- תיקון: יצירת קוד הזמנה נכשלה עם
--   "function gen_random_bytes(integer) does not exist"
--
-- הפונקציה המקורית השתמשה ב-gen_random_bytes מהתוסף pgcrypto, ש-Supabase
-- מתקין בסכימה extensions — מחוץ ל-search_path של הפונקציה. הגרסה הזו
-- משתמשת ב-gen_random_uuid, שהיא פונקציית ליבה של Postgres וזמינה תמיד.
--
-- להרצה: SQL Editor -> הדבקה -> Run. בטוח להרצה חוזרת.
-- ============================================================================

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

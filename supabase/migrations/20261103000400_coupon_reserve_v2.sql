-- Replaces coupon_reserve (migration ...0300). Two fixes:
--  1. One redemption per person: a second request from the same user never takes another slot, and a
--     unique index enforces it even if this function were bypassed.
--  2. It returns the id of the row it wrote, so a failed grant can release exactly that row and nothing else.
-- Statuses: 'reserved' (new slot taken, id returned), 'already' (this user already holds a redemption,
-- no new slot, id of the existing row), 'full' (the code is used up).
-- Locks are always taken in the same order (code, then user), so callers cannot deadlock.

drop function if exists public.coupon_reserve(text, text, int);

create or replace function public.coupon_reserve(p_coupon text, p_user text, p_max int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare existing bigint; used int; new_id bigint;
begin
  perform pg_advisory_xact_lock(hashtext('coupon_redeem:code:' || p_coupon));
  perform pg_advisory_xact_lock(hashtext('coupon_redeem:user:' || p_user));

  select id into existing from public.payment_events
    where kind = 'coupon_redeemed' and user_id = p_user order by id limit 1;
  if existing is not null then
    return jsonb_build_object('status', 'already', 'id', existing);
  end if;

  select count(*) into used from public.payment_events
    where kind = 'coupon_redeemed' and detail->>'coupon' = p_coupon;
  if used >= p_max then return jsonb_build_object('status', 'full'); end if;

  insert into public.payment_events (user_id, kind, to_status, detail)
    values (p_user, 'coupon_redeemed', 'paid', jsonb_build_object('coupon', p_coupon))
    returning id into new_id;
  return jsonb_build_object('status', 'reserved', 'id', new_id);
end $$;

-- Belt and braces: at most one coupon redemption per user, whatever calls the database.
create unique index if not exists payment_events_one_coupon_per_user
  on public.payment_events (user_id) where kind = 'coupon_redeemed';

revoke all on function public.coupon_reserve(text, text, int) from public, anon, authenticated;
grant execute on function public.coupon_reserve(text, text, int) to service_role;

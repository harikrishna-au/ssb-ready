-- Coupon checks that must be all-or-nothing. Each function takes a lock, checks, and records in one
-- transaction, so parallel requests cannot all pass a check that only one of them should.
-- Callable only with the service-role key (the edge function); never by anon or logged-in browsers.

-- Records a guess attempt unless a limit is already reached. Blocked requests are NOT recorded, so a
-- throttled caller cannot fill the shared bucket and lock other people out. Lock order is always
-- user then global, so two callers can never deadlock.
create or replace function public.coupon_attempt(p_user text, p_user_max int, p_global_max int)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare mine int; everyone int;
begin
  perform pg_advisory_xact_lock(hashtext('coupon_attempt:user:' || p_user));
  select count(*) into mine from public.payment_events
    where kind = 'coupon_attempt' and user_id = p_user and created_at > now() - interval '1 hour';
  if mine >= p_user_max then return 'user_limited'; end if;

  perform pg_advisory_xact_lock(hashtext('coupon_attempt:global'));
  select count(*) into everyone from public.payment_events
    where kind = 'coupon_attempt' and created_at > now() - interval '1 hour';
  if everyone >= p_global_max then return 'global_limited'; end if;

  insert into public.payment_events (user_id, kind) values (p_user, 'coupon_attempt');
  return 'ok';
end $$;

-- Reserves one redemption of a code. Returns false when the code is used up. The reservation row is the
-- redemption record, written before premium is granted; the caller removes it if the grant fails.
create or replace function public.coupon_reserve(p_coupon text, p_user text, p_max int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare used int;
begin
  perform pg_advisory_xact_lock(hashtext('coupon_redeem:' || p_coupon));
  select count(*) into used from public.payment_events
    where kind = 'coupon_redeemed' and detail->>'coupon' = p_coupon;
  if used >= p_max then return false; end if;
  insert into public.payment_events (user_id, kind, to_status, detail)
    values (p_user, 'coupon_redeemed', 'paid', jsonb_build_object('coupon', p_coupon));
  return true;
end $$;

revoke all on function public.coupon_attempt(text, int, int) from public, anon, authenticated;
revoke all on function public.coupon_reserve(text, text, int) from public, anon, authenticated;
grant execute on function public.coupon_attempt(text, int, int) to service_role;
grant execute on function public.coupon_reserve(text, text, int) to service_role;

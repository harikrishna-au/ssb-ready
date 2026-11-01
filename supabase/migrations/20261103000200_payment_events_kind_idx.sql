-- Coupon throttling counts recent events by kind on every redeem request; keep that fast.
create index if not exists payment_events_kind_time_idx on public.payment_events (kind, created_at desc);

-- Public buckets for PPDT/TAT pictures and OIR question images.
insert into storage.buckets (id, name, public)
values ('ppdt-tat-images', 'ppdt-tat-images', true),
       ('oir-questions', 'oir-questions', true)
on conflict (id) do update set public = excluded.public;

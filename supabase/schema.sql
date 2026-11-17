-- MaWiYas · pencadangan data siswa ke Supabase
-- Jalankan SEKALI di Supabase Dashboard → SQL Editor → New query → Run.
--
-- Prinsip keamanan:
--   • Aplikasi (kunci publishable/anon) HANYA boleh MENAMBAH baris. Tidak bisa membaca, mengubah, atau menghapus.
--   • Hanya pemilik proyek yang bisa melihat data: lewat Dashboard (Table Editor / SQL Editor),
--     yang berjalan sebagai peran postgres dan tidak dibatasi RLS.
--   • JANGAN pernah menaruh kunci service_role / secret di aplikasi.
--   • Data hanya berisi kode siswa (A01, S12, …) — tanpa nama, foto, email, lokasi (agents.md aturan 18).

create table if not exists public.mawiyas_records (
  id           uuid primary key,                       -- dibuat di HP; kirim ulang tidak menggandakan
  device_id    text not null check (char_length(device_id) between 8 and 64),
  table_name   text not null check (table_name in
                 ('students','attempts','hintEvents','simulations','surveys','questRuns','questAnswers','rests')),
  local_key    text not null check (char_length(local_key) <= 64),
  student_code text check (student_code is null or student_code ~ '^[A-Z]{1,3}[0-9]{1,9}$'),
  payload      jsonb not null check (pg_column_size(payload) < 65536),
  client_ts    timestamptz not null,
  received_at  timestamptz not null default now()
);

create index if not exists mawiyas_records_student_idx on public.mawiyas_records (student_code, table_name);
create index if not exists mawiyas_records_latest_idx on public.mawiyas_records (device_id, table_name, local_key, client_ts desc);

alter table public.mawiyas_records enable row level security;
alter table public.mawiyas_records force row level security;

revoke all on public.mawiyas_records from anon, authenticated;
grant insert on public.mawiyas_records to anon, authenticated;

drop policy if exists "aplikasi hanya menambah" on public.mawiyas_records;
create policy "aplikasi hanya menambah" on public.mawiyas_records
  for insert to anon, authenticated
  with check (received_at > now() - interval '5 minutes');
-- Sengaja TIDAK ada policy select/update/delete → aplikasi & orang lain tidak bisa membaca data.

-- Tampilan versi terbaru tiap data (data yang diperbarui, mis. progres level, dikirim ulang sebagai baris baru).
-- Hanya bisa dibuka pemilik dari Dashboard.
create or replace view public.mawiyas_latest with (security_invoker = true) as
  select distinct on (device_id, table_name, local_key) *
  from public.mawiyas_records
  order by device_id, table_name, local_key, client_ts desc, received_at desc;
revoke all on public.mawiyas_latest from anon, authenticated;

-- Contoh kueri untuk pemilik (SQL Editor):
--   select student_code, payload->>'level' as level, payload->>'status' as status, payload->'run'->>'index' as soal
--   from public.mawiyas_latest where table_name = 'questRuns' order by student_code;
--   select student_code, payload->>'mode' as mode, payload->>'itemId' as soal, payload->>'total' as skor
--   from public.mawiyas_latest where table_name = 'attempts' order by student_code;

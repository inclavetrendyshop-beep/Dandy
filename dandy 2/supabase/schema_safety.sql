-- Ejecuta esto en Supabase DESPUÉS de schema.sql: Dashboard > SQL Editor > New query > pega todo > Run
-- Agrega: bloqueo de usuarios y reportes.

create table blocked_users (
  id bigint generated always as identity primary key,
  blocker_id uuid references profiles(id) on delete cascade not null,
  blocked_id uuid references profiles(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  unique (blocker_id, blocked_id)
);

create table reports (
  id bigint generated always as identity primary key,
  reporter_id uuid references profiles(id) on delete cascade not null,
  reported_id uuid references profiles(id) on delete cascade not null,
  reason text not null,
  details text default '',
  status text default 'pending' check (status in ('pending','reviewed','dismissed')),
  created_at timestamp with time zone default now()
);

alter table blocked_users enable row level security;
alter table reports enable row level security;

-- Cada quien ve y crea sus propios bloqueos
create policy "Ver mis bloqueos" on blocked_users
  for select using (auth.uid() = blocker_id);
create policy "Crear mis bloqueos" on blocked_users
  for insert with check (auth.uid() = blocker_id);
create policy "Eliminar mis bloqueos" on blocked_users
  for delete using (auth.uid() = blocker_id);

-- Cualquiera puede crear un reporte sobre otro usuario; solo ve los suyos
create policy "Ver mis reportes enviados" on reports
  for select using (auth.uid() = reporter_id);
create policy "Crear reportes" on reports
  for insert with check (auth.uid() = reporter_id);

-- Extra: agrega columna a profiles para saber si una cuenta fue suspendida por moderación
alter table profiles add column if not exists suspended boolean default false;

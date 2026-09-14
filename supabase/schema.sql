-- Ejecuta esto en Supabase: Dashboard > SQL Editor > New query > pega todo > Run

create table profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  age int not null check (age >= 18),
  bio text default '',
  photos text[] default '{}',
  city text default '',
  tags text[] default '{}',
  lat float,
  lng float,
  pref_min_age int default 18,
  pref_max_age int default 99,
  pref_max_distance int default 100,
  created_at timestamp with time zone default now()
);

create table swipes (
  id bigint generated always as identity primary key,
  swiper_id uuid references profiles(id) on delete cascade not null,
  swiped_id uuid references profiles(id) on delete cascade not null,
  action text check (action in ('like','pass')) not null,
  created_at timestamp with time zone default now(),
  unique (swiper_id, swiped_id)
);

create table matches (
  id bigint generated always as identity primary key,
  user1_id uuid references profiles(id) on delete cascade not null,
  user2_id uuid references profiles(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  unique (user1_id, user2_id)
);

create table messages (
  id bigint generated always as identity primary key,
  match_id bigint references matches(id) on delete cascade not null,
  sender_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default now()
);

-- Seguridad: cada quien ve/edita solo lo que le corresponde
alter table profiles enable row level security;
alter table swipes enable row level security;
alter table matches enable row level security;
alter table messages enable row level security;

create policy "Perfiles visibles para todos los usuarios logueados" on profiles
  for select using (auth.role() = 'authenticated');
create policy "Cada quien edita su propio perfil" on profiles
  for insert with check (auth.uid() = id);
create policy "Cada quien actualiza su propio perfil" on profiles
  for update using (auth.uid() = id);

create policy "Ver mis propios swipes" on swipes
  for select using (auth.uid() = swiper_id);
create policy "Crear mis swipes" on swipes
  for insert with check (auth.uid() = swiper_id);

create policy "Ver mis matches" on matches
  for select using (auth.uid() = user1_id or auth.uid() = user2_id);
create policy "Crear matches" on matches
  for insert with check (auth.uid() = user1_id or auth.uid() = user2_id);

create policy "Ver mensajes de mis matches" on messages
  for select using (
    exists (select 1 from matches m where m.id = match_id and (m.user1_id = auth.uid() or m.user2_id = auth.uid()))
  );
create policy "Enviar mensajes en mis matches" on messages
  for insert with check (
    auth.uid() = sender_id and
    exists (select 1 from matches m where m.id = match_id and (m.user1_id = auth.uid() or m.user2_id = auth.uid()))
  );

-- Cuando dos personas se dan like mutuo, se crea el match automáticamente
create or replace function check_match() returns trigger as $$
begin
  if new.action = 'like' then
    if exists (
      select 1 from swipes
      where swiper_id = new.swiped_id and swiped_id = new.swiper_id and action = 'like'
    ) then
      insert into matches (user1_id, user2_id)
      values (least(new.swiper_id, new.swiped_id), greatest(new.swiper_id, new.swiped_id))
      on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_swipe_created
  after insert on swipes
  for each row execute function check_match();

-- Bucket de almacenamiento para fotos de perfil (ejecutar en Storage > New bucket "photos", marcar como público)

-- Profe de Ajedrez · esquema inicial
-- Pégalo completo en Supabase → SQL Editor → Run (o `supabase db push` con la CLI).
-- Mapea 1:1 con src/services/club/types.ts. Todas las tablas tienen RLS activado.

-- ───────────────────────── Perfil y permisos ─────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  avatar text not null default 'piece-knight',
  motto text check (char_length(motto) <= 80),
  created_at timestamptz not null default now()
);

-- Administradores de la plataforma (se añaden a mano, ver el final del archivo)
create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade
);

-- Personas autorizadas para crear clubes (admin o quien canjeó un link)
create table public.club_creators (
  user_id uuid primary key references auth.users (id) on delete cascade,
  granted_at timestamptz not null default now()
);

create table public.club_creator_tokens (
  token text primary key default replace(gen_random_uuid()::text, '-', ''),
  created_by uuid not null references auth.users (id) on delete cascade,
  used_by uuid references auth.users (id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- ───────────────────────── Club ─────────────────────────

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  invite_code text not null unique,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Cada persona pertenece a un solo club (user_id es la clave)
create table public.club_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  club_id uuid not null references public.clubs (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'manager', 'member')),
  joined_at timestamptz not null default now()
);
create index club_members_club_idx on public.club_members (club_id);

create table public.player_stats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  xp integer not null default 0,
  level integer not null default 1,
  rating integer not null default 0,
  streak integer not null default 0,
  best_streak integer not null default 0,
  last_active date,
  lessons_completed integer not null default 0,
  puzzles_solved integer not null default 0,
  achievements integer not null default 0,
  modules jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.daily_activity (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  xp integer not null default 0,
  puzzles integer not null default 0,
  lessons integer not null default 0,
  reviews integer not null default 0,
  minutes integer not null default 0,
  primary key (user_id, day)
);

create table public.activity_feed (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  icon text not null,
  text text not null check (char_length(text) <= 300),
  created_at timestamptz not null default now()
);
create index activity_feed_club_idx on public.activity_feed (club_id, created_at desc);

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  challenger_id uuid not null references auth.users (id) on delete cascade,
  opponent_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('puzzles', 'rush')),
  puzzle_ids text[] not null default '{}',
  status text not null default 'open' check (status in ('open', 'done', 'declined', 'expired')),
  -- null con status = 'done' significa empate
  winner_id uuid references auth.users (id) on delete set null,
  rematch_of uuid references public.challenges (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check (challenger_id <> opponent_id)
);
create index challenges_challenger_idx on public.challenges (challenger_id);
create index challenges_opponent_idx on public.challenges (opponent_id);

create table public.challenge_results (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  solved integer not null default 0,
  mistakes integer not null default 0,
  time_ms integer not null default 0,
  finished_at timestamptz not null default now(),
  primary key (challenge_id, user_id)
);

create table public.nudges (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs (id) on delete cascade,
  from_id uuid not null references auth.users (id) on delete cascade,
  to_id uuid not null references auth.users (id) on delete cascade,
  day date not null default current_date,
  read boolean not null default false,
  created_at timestamptz not null default now(),
  -- un solo ánimo por persona y día
  unique (from_id, to_id, day)
);
create index nudges_to_idx on public.nudges (to_id, read);

create table public.club_weeks (
  club_id uuid not null references public.clubs (id) on delete cascade,
  week_start date not null,
  metric text not null check (metric in ('puzzles', 'minutes', 'xp', 'lessons')),
  target integer not null check (target > 0),
  puzzle_ids text[] not null default '{}',
  primary key (club_id, week_start)
);

create table public.club_week_results (
  club_id uuid not null,
  week_start date not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  solved integer not null default 0,
  time_ms integer not null default 0,
  finished_at timestamptz not null default now(),
  primary key (club_id, week_start, user_id),
  foreign key (club_id, week_start) references public.club_weeks (club_id, week_start) on delete cascade
);

-- ───────────────────────── Progreso personal (nube) ─────────────────────────
-- Una fila por usuario con el JSON de cada store (zustand). Se sincroniza desde el cliente.

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table public.user_game_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table public.user_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create table public.review_cards (
  user_id uuid not null references auth.users (id) on delete cascade,
  id text not null,
  kind text not null check (kind in ('exercise', 'opening-line')),
  ref text not null,
  ease real not null,
  interval integer not null,
  reps integer not null,
  due date not null,
  lapses integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- ───────────────────────── Funciones de ayuda (security definer) ─────────────────────────
-- Evitan la recursión de RLS al consultar club_members desde las políticas.

create function public.my_club_id() returns uuid
language sql stable security definer set search_path = public as $$
  select club_id from public.club_members where user_id = auth.uid()
$$;

create function public.my_club_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.club_members where user_id = auth.uid()
$$;

create function public.same_club(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.club_members a
    join public.club_members b on a.club_id = b.club_id
    where a.user_id = auth.uid() and b.user_id = uid
  )
$$;

create function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid())
$$;

-- ───────────────────────── RLS ─────────────────────────

alter table public.profiles enable row level security;
alter table public.platform_admins enable row level security;
alter table public.club_creators enable row level security;
alter table public.club_creator_tokens enable row level security;
alter table public.clubs enable row level security;
alter table public.club_members enable row level security;
alter table public.player_stats enable row level security;
alter table public.daily_activity enable row level security;
alter table public.activity_feed enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_results enable row level security;
alter table public.nudges enable row level security;
alter table public.club_weeks enable row level security;
alter table public.club_week_results enable row level security;
alter table public.user_settings enable row level security;
alter table public.user_game_state enable row level security;
alter table public.user_progress enable row level security;
alter table public.review_cards enable row level security;

-- platform_admins, club_creators y club_creator_tokens: sin políticas = nadie las toca
-- desde el cliente; solo las funciones security definer de abajo.

create policy "perfil: propio o de mi club" on public.profiles
  for select using (id = auth.uid() or public.same_club(id));
create policy "perfil: crear el mío" on public.profiles
  for insert with check (id = auth.uid());
create policy "perfil: editar el mío" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "club: ver el mío" on public.clubs
  for select using (id = public.my_club_id());

create policy "miembros: ver los de mi club" on public.club_members
  for select using (club_id = public.my_club_id());

create policy "stats: propias o de mi club" on public.player_stats
  for select using (user_id = auth.uid() or public.same_club(user_id));
create policy "stats: escribir las mías" on public.player_stats
  for insert with check (user_id = auth.uid());
create policy "stats: actualizar las mías" on public.player_stats
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "actividad: propia o de mi club" on public.daily_activity
  for select using (user_id = auth.uid() or public.same_club(user_id));
create policy "actividad: escribir la mía" on public.daily_activity
  for insert with check (user_id = auth.uid());
create policy "actividad: actualizar la mía" on public.daily_activity
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "feed: ver el de mi club" on public.activity_feed
  for select using (club_id = public.my_club_id());
create policy "feed: publicar lo mío" on public.activity_feed
  for insert with check (user_id = auth.uid() and club_id = public.my_club_id());

create policy "retos: ver los míos" on public.challenges
  for select using (auth.uid() in (challenger_id, opponent_id));
create policy "retos: crear contra alguien de mi club" on public.challenges
  for insert with check (
    challenger_id = auth.uid()
    and club_id = public.my_club_id()
    and public.same_club(opponent_id)
    and status = 'open'
    and winner_id is null
  );
-- Responder / rechazar se hace con las funciones decline_challenge y submit_challenge_result

create policy "resultados de reto: ver los de mis retos" on public.challenge_results
  for select using (
    exists (select 1 from public.challenges c
            where c.id = challenge_id and auth.uid() in (c.challenger_id, c.opponent_id))
  );

create policy "ánimos: ver los míos" on public.nudges
  for select using (auth.uid() in (from_id, to_id));
create policy "ánimos: enviar a mi club" on public.nudges
  for insert with check (from_id = auth.uid() and club_id = public.my_club_id() and public.same_club(to_id));
create policy "ánimos: marcar los míos como leídos" on public.nudges
  for update using (to_id = auth.uid()) with check (to_id = auth.uid());

create policy "semana: ver la de mi club" on public.club_weeks
  for select using (club_id = public.my_club_id());
create policy "semana: abrirla (la primera persona la fija)" on public.club_weeks
  for insert with check (club_id = public.my_club_id());

create policy "semana: ver resultados de mi club" on public.club_week_results
  for select using (club_id = public.my_club_id());
create policy "semana: guardar mi resultado" on public.club_week_results
  for insert with check (user_id = auth.uid() and club_id = public.my_club_id());

create policy "ajustes: solo míos" on public.user_settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "juego: solo mío" on public.user_game_state
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "progreso: solo mío" on public.user_progress
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "repaso: solo mío" on public.review_cards
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ───────────────────────── Acciones del club (RPC) ─────────────────────────

create function public.can_create_club() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_platform_admin()
      or exists (select 1 from public.club_creators where user_id = auth.uid())
$$;

-- Admin: genera el token del link /crear-club/:token
create function public.create_club_invite() returns text
language plpgsql security definer set search_path = public as $$
declare t text;
begin
  if not public.is_platform_admin() then raise exception 'Solo el administrador puede crear invitaciones'; end if;
  insert into public.club_creator_tokens (created_by) values (auth.uid()) returning token into t;
  return t;
end $$;

-- Canjea un token: da permiso para crear un club. Devuelve si era válido.
create function public.redeem_creator_token(p_token text) returns boolean
language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  if auth.uid() is null then raise exception 'Inicia sesión primero'; end if;
  update public.club_creator_tokens
     set used_by = auth.uid(), used_at = now()
   where token = p_token and used_by is null
  returning true into ok;
  if ok then
    insert into public.club_creators (user_id) values (auth.uid()) on conflict do nothing;
    return true;
  end if;
  return false;
end $$;

create function public.create_club(p_name text) returns public.clubs
language plpgsql security definer set search_path = public as $$
declare c public.clubs; code text;
begin
  if auth.uid() is null then raise exception 'Inicia sesión primero'; end if;
  if not public.can_create_club() then raise exception 'No tienes permiso para crear un club'; end if;
  if exists (select 1 from public.club_members where user_id = auth.uid()) then
    raise exception 'Ya perteneces a un club';
  end if;
  loop
    code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from public.clubs where invite_code = code);
  end loop;
  insert into public.clubs (name, invite_code, created_by) values (trim(p_name), code, auth.uid()) returning * into c;
  insert into public.club_members (user_id, club_id, role) values (auth.uid(), c.id, 'owner');
  return c;
end $$;

create function public.join_club(p_code text) returns public.clubs
language plpgsql security definer set search_path = public as $$
declare c public.clubs;
begin
  if auth.uid() is null then raise exception 'Inicia sesión primero'; end if;
  select * into c from public.clubs where invite_code = upper(trim(p_code));
  if not found then raise exception 'Ese código no existe'; end if;
  if exists (select 1 from public.club_members where user_id = auth.uid()) then
    raise exception 'Ya perteneces a un club';
  end if;
  insert into public.club_members (user_id, club_id, role) values (auth.uid(), c.id, 'member');
  return c;
end $$;

-- Salir: si eras el organizador, pasa a la persona que lleva más tiempo; si eras la única, se borra el club.
create function public.leave_club() returns void
language plpgsql security definer set search_path = public as $$
declare m public.club_members; heir uuid;
begin
  select * into m from public.club_members where user_id = auth.uid();
  if not found then return; end if;
  delete from public.club_members where user_id = auth.uid();
  if m.role = 'owner' then
    select user_id into heir from public.club_members
     where club_id = m.club_id order by (role = 'manager') desc, joined_at asc limit 1;
    if heir is null then
      delete from public.clubs where id = m.club_id;
    else
      update public.club_members set role = 'owner' where user_id = heir;
    end if;
  end if;
end $$;

create function public.set_member_role(p_member uuid, p_role text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_role not in ('manager', 'member') then raise exception 'Rol no válido'; end if;
  if public.my_club_role() is distinct from 'owner' then raise exception 'Solo el organizador puede cambiar roles'; end if;
  update public.club_members set role = p_role
   where user_id = p_member and club_id = public.my_club_id() and role <> 'owner';
end $$;

-- Organizador: a cualquiera; colaborador: solo a participantes
create function public.remove_member(p_member uuid) returns void
language plpgsql security definer set search_path = public as $$
declare mine text := public.my_club_role(); target text;
begin
  select role into target from public.club_members
   where user_id = p_member and club_id = public.my_club_id();
  if target is null or p_member = auth.uid() or target = 'owner' then return; end if;
  if mine = 'owner' or (mine = 'manager' and target = 'member') then
    delete from public.club_members where user_id = p_member;
  else
    raise exception 'No tienes permiso para quitar a esta persona';
  end if;
end $$;

create function public.decline_challenge(p_id uuid) returns void
language sql security definer set search_path = public as $$
  update public.challenges set status = 'declined'
   where id = p_id and opponent_id = auth.uid() and status = 'open'
$$;

-- Guarda mi resultado; cuando juegan los dos decide el ganador (más aciertos, menos fallos, menos tiempo)
create function public.submit_challenge_result(p_id uuid, p_solved int, p_mistakes int, p_time_ms int)
returns public.challenges
language plpgsql security definer set search_path = public as $$
declare c public.challenges; a public.challenge_results; b public.challenge_results;
begin
  select * into c from public.challenges where id = p_id for update;
  if not found or auth.uid() not in (c.challenger_id, c.opponent_id) then raise exception 'Reto no encontrado'; end if;
  if c.status <> 'open' then raise exception 'Este reto ya terminó'; end if;
  insert into public.challenge_results (challenge_id, user_id, solved, mistakes, time_ms)
  values (p_id, auth.uid(), greatest(p_solved, 0), greatest(p_mistakes, 0), greatest(p_time_ms, 0))
  on conflict (challenge_id, user_id) do nothing;

  select * into a from public.challenge_results where challenge_id = p_id and user_id = c.challenger_id;
  select * into b from public.challenge_results where challenge_id = p_id and user_id = c.opponent_id;
  if a.user_id is not null and b.user_id is not null then
    update public.challenges set
      status = 'done',
      winner_id = case
        when a.solved <> b.solved then (case when a.solved > b.solved then a.user_id else b.user_id end)
        when a.mistakes <> b.mistakes then (case when a.mistakes < b.mistakes then a.user_id else b.user_id end)
        when a.time_ms <> b.time_ms then (case when a.time_ms < b.time_ms then a.user_id else b.user_id end)
        else null end
    where id = p_id returning * into c;
  end if;
  return c;
end $$;

-- Permisos: las funciones solo para usuarios con sesión
revoke all on function public.create_club_invite() from public, anon;
revoke all on function public.redeem_creator_token(text) from public, anon;
revoke all on function public.create_club(text) from public, anon;
revoke all on function public.join_club(text) from public, anon;
revoke all on function public.leave_club() from public, anon;
revoke all on function public.set_member_role(uuid, text) from public, anon;
revoke all on function public.remove_member(uuid) from public, anon;
revoke all on function public.decline_challenge(uuid) from public, anon;
revoke all on function public.submit_challenge_result(uuid, int, int, int) from public, anon;
revoke all on function public.can_create_club() from public, anon;
grant execute on function public.create_club_invite() to authenticated;
grant execute on function public.redeem_creator_token(text) to authenticated;
grant execute on function public.create_club(text) to authenticated;
grant execute on function public.join_club(text) to authenticated;
grant execute on function public.leave_club() to authenticated;
grant execute on function public.set_member_role(uuid, text) to authenticated;
grant execute on function public.remove_member(uuid) to authenticated;
grant execute on function public.decline_challenge(uuid) to authenticated;
grant execute on function public.submit_challenge_result(uuid, int, int, int) to authenticated;
grant execute on function public.can_create_club() to authenticated;

-- ───────────────────────── Realtime ─────────────────────────
alter publication supabase_realtime add table
  public.activity_feed, public.challenges, public.challenge_results, public.nudges, public.club_members;

-- ───────────────────────── Después de correr esto ─────────────────────────
-- Hazte administrador de la plataforma (cambia el correo por el tuyo, tras registrarte en la app):
--   insert into public.platform_admins (user_id)
--   select id from auth.users where email = 'tu-correo@ejemplo.com';

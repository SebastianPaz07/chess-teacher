-- Muro del club: respuestas, «me gusta» y lo que cada persona ya leyó.
-- Pégalo completo en Supabase → SQL Editor → Run (o `supabase db push` con la CLI),
-- después del esquema inicial. Las publicaciones son filas de activity_feed con kind = 'post'.

begin;

-- ───────────────────────── Tablas ─────────────────────────

create table public.feed_comments (
  id uuid primary key default gen_random_uuid(),
  feed_id uuid not null references public.activity_feed (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  text text not null check (char_length(trim(text)) between 1 and 300),
  created_at timestamptz not null default now()
);
create index feed_comments_feed_idx on public.feed_comments (feed_id, created_at);

create table public.feed_likes (
  feed_id uuid not null references public.activity_feed (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (feed_id, user_id)
);

-- Cuándo abrí cada hilo
create table public.feed_reads (
  user_id uuid not null references auth.users (id) on delete cascade,
  feed_id uuid not null references public.activity_feed (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, feed_id)
);

-- Cuándo pulsé «Marcar todo como leído»
create table public.wall_reads (
  user_id uuid primary key references auth.users (id) on delete cascade,
  all_read_at timestamptz not null default now()
);

-- ───────────────────────── Permisos ─────────────────────────

-- Lo propio siempre; el organizador, cualquiera; un colaborador, lo de participantes
-- (o de quien ya no está). Igual que canDeleteContent en la app.
create function public.can_moderate(author uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    author = auth.uid()
    or public.my_club_role() = 'owner'
    or (
      public.my_club_role() = 'manager'
      and coalesce((select role from public.club_members where user_id = author and club_id = public.my_club_id()), 'member') = 'member'
    ),
    false)
$$;

-- ¿Es una entrada del muro de mi club?
create function public.in_my_wall(p_feed uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.activity_feed where id = p_feed and club_id = public.my_club_id())
$$;

alter table public.feed_comments enable row level security;
alter table public.feed_likes enable row level security;
alter table public.feed_reads enable row level security;
alter table public.wall_reads enable row level security;

create policy "respuestas: ver las de mi club" on public.feed_comments
  for select using (public.in_my_wall(feed_id));
create policy "respuestas: escribir las mías" on public.feed_comments
  for insert with check (user_id = auth.uid() and public.in_my_wall(feed_id));
create policy "respuestas: borrar" on public.feed_comments
  for delete using (public.in_my_wall(feed_id) and public.can_moderate(user_id));

create policy "me gusta: ver los de mi club" on public.feed_likes
  for select using (public.in_my_wall(feed_id));
create policy "me gusta: poner el mío" on public.feed_likes
  for insert with check (user_id = auth.uid() and public.in_my_wall(feed_id));
create policy "me gusta: quitar el mío" on public.feed_likes
  for delete using (user_id = auth.uid());

create policy "leídos: solo míos" on public.feed_reads
  for all using (user_id = auth.uid()) with check (user_id = auth.uid() and public.in_my_wall(feed_id));
create policy "leído todo: solo mío" on public.wall_reads
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Solo se borran publicaciones; la actividad automática no
create policy "feed: borrar publicaciones" on public.activity_feed
  for delete using (kind = 'post' and club_id = public.my_club_id() and public.can_moderate(user_id));

-- ───────────────────────── Consultas del muro ─────────────────────────
-- Sin «security definer»: se aplican las políticas de arriba.

-- Desde cuándo algo cuenta como nuevo para mí en una entrada (como mínimo, desde que entré al club)
create function public.wall_seen_at(p_feed uuid) returns timestamptz
language sql stable set search_path = public as $$
  select greatest(
    (select joined_at from public.club_members where user_id = auth.uid()),
    (select all_read_at from public.wall_reads where user_id = auth.uid()),
    (select read_at from public.feed_reads where user_id = auth.uid() and feed_id = p_feed))
$$;

-- Contadores de varias entradas en una sola consulta
create function public.wall_social(p_ids uuid[])
returns table (feed_id uuid, likes int, liked_by_me boolean, comment_count int, is_new boolean, new_replies int)
language sql stable set search_path = public as $$
  select
    f.id,
    (select count(*)::int from public.feed_likes l where l.feed_id = f.id),
    exists (select 1 from public.feed_likes l where l.feed_id = f.id and l.user_id = auth.uid()),
    (select count(*)::int from public.feed_comments c where c.feed_id = f.id),
    f.kind = 'post' and f.user_id <> auth.uid() and f.created_at > s.seen_at,
    (select count(*)::int from public.feed_comments c where c.feed_id = f.id and c.user_id <> auth.uid() and c.created_at > s.seen_at)
  from public.activity_feed f
  cross join lateral (select public.wall_seen_at(f.id) as seen_at) s
  where f.id = any (p_ids) and f.club_id = public.my_club_id()
$$;

create function public.wall_comments(p_feed uuid)
returns table (id uuid, feed_id uuid, user_id uuid, text text, created_at timestamptz, is_new boolean)
language sql stable set search_path = public as $$
  select c.id, c.feed_id, c.user_id, c.text, c.created_at,
         c.user_id <> auth.uid() and c.created_at > public.wall_seen_at(p_feed)
  from public.feed_comments c
  where c.feed_id = p_feed
  order by c.created_at
$$;

-- Respuestas de otras personas en mis entradas o, después de la mía, en hilos donde respondí
create function public.wall_replies(p_limit int default 10)
returns table (id uuid, feed_id uuid, user_id uuid, text text, created_at timestamptz, on_mine boolean)
language sql stable set search_path = public as $$
  select c.id, c.feed_id, c.user_id, c.text, c.created_at, f.user_id = auth.uid()
  from public.feed_comments c
  join public.activity_feed f on f.id = c.feed_id
  where f.club_id = public.my_club_id()
    and c.user_id <> auth.uid()
    and (
      f.user_id = auth.uid()
      or exists (select 1 from public.feed_comments mine
                 where mine.feed_id = c.feed_id and mine.user_id = auth.uid() and mine.created_at <= c.created_at)
    )
  order by c.created_at desc
  limit least(greatest(p_limit, 0), 50)
$$;

-- Marca como leída una entrada (o todo el muro, sin p_feed). Devuelve si había algo sin leer.
create function public.mark_wall_read(p_feed uuid default null) returns boolean
language plpgsql set search_path = public as $$
declare changed boolean;
begin
  select exists (
    select 1 from public.wall_social(array(
      select f.id from public.activity_feed f
      where f.club_id = public.my_club_id() and (p_feed is null or f.id = p_feed)
    )) s where s.is_new or s.new_replies > 0
  ) into changed;

  if changed and p_feed is null then
    insert into public.wall_reads (user_id, all_read_at) values (auth.uid(), now())
    on conflict (user_id) do update set all_read_at = now();
  elsif changed then
    insert into public.feed_reads (user_id, feed_id, read_at) values (auth.uid(), p_feed, now())
    on conflict (user_id, feed_id) do update set read_at = now();
  end if;
  return changed;
end $$;

revoke all on function public.can_moderate(uuid) from public, anon;
revoke all on function public.in_my_wall(uuid) from public, anon;
revoke all on function public.wall_seen_at(uuid) from public, anon;
revoke all on function public.wall_social(uuid[]) from public, anon;
revoke all on function public.wall_comments(uuid) from public, anon;
revoke all on function public.wall_replies(int) from public, anon;
revoke all on function public.mark_wall_read(uuid) from public, anon;
grant execute on function public.can_moderate(uuid) to authenticated;
grant execute on function public.in_my_wall(uuid) to authenticated;
grant execute on function public.wall_seen_at(uuid) to authenticated;
grant execute on function public.wall_social(uuid[]) to authenticated;
grant execute on function public.wall_comments(uuid) to authenticated;
grant execute on function public.wall_replies(int) to authenticated;
grant execute on function public.mark_wall_read(uuid) to authenticated;

-- ───────────────────────── Realtime ─────────────────────────
alter publication supabase_realtime add table public.feed_comments, public.feed_likes;

commit;

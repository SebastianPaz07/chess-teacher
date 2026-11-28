-- ChezzClub · Ranking del club en una sola consulta
-- Pégalo completo en Supabase → SQL Editor → Run (o `supabase db push` con la CLI).
-- Hasta que se ejecute, la app sigue pidiendo estos datos tabla por tabla.

-- Miembros de MI club con perfil, estadísticas y actividad desde `p_from`.
-- security definer: no se comprueba el club fila por fila; solo devuelve lo que
-- las políticas ya dejan ver (my_club_id() sale de la sesión, no de un parámetro).
-- Al ser un único valor JSON, no le afecta el límite de filas por respuesta.
create or replace function public.club_inputs(p_from date) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id', m.user_id,
    'role', m.role,
    'joined_at', m.joined_at,
    'profile', (select jsonb_build_object('name', p.name, 'avatar', p.avatar, 'motto', p.motto) from public.profiles p where p.id = m.user_id),
    'stats', (select to_jsonb(s) from public.player_stats s where s.user_id = m.user_id),
    'activity', coalesce((select jsonb_agg(to_jsonb(d)) from public.daily_activity d where d.user_id = m.user_id and d.day >= p_from), '[]'::jsonb)
  )), '[]'::jsonb)
  from public.club_members m
  where m.club_id = public.my_club_id()
$$;

revoke all on function public.club_inputs(date) from public, anon;
grant execute on function public.club_inputs(date) to authenticated;

-- Que la API vea la función al momento
notify pgrst, 'reload schema';

-- Muro: cada persona borra solo lo suyo (ya no hay borrado por organizador o colaborador).
-- Pégalo completo en Supabase → SQL Editor → Run, después de 20261127000000_wall.sql.

begin;

drop policy "respuestas: borrar" on public.feed_comments;
create policy "respuestas: borrar las mías" on public.feed_comments
  for delete using (user_id = auth.uid() and public.in_my_wall(feed_id));

drop policy "feed: borrar publicaciones" on public.activity_feed;
create policy "feed: borrar mis publicaciones" on public.activity_feed
  for delete using (kind = 'post' and user_id = auth.uid() and club_id = public.my_club_id());

drop function public.can_moderate(uuid);

commit;

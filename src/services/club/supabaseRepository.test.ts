import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { createSupabaseRepository } from './supabaseRepository';

const DAY = new Date(2026, 10, 25, 12, 0);
const club = { id: 'c1', name: 'Club', invite_code: 'ABC123', created_by: 'yo', created_at: '2026-11-01' };
const members = [
  { user_id: 'yo', role: 'owner', joined_at: '2026-11-01' },
  { user_id: 'ana', role: 'member', joined_at: '2026-11-02' },
];
const profiles = [
  { id: 'yo', name: 'Yo', avatar: 'piece-knight', motto: null },
  { id: 'ana', name: 'Ana', avatar: 'piece-queen', motto: 'Jaque' },
];
const activity = [{ user_id: 'ana', day: '2026-11-25', xp: 40, puzzles: 7, lessons: 0, reviews: 0, minutes: 12 }];

/** Cliente falso: anota cada petición. Con `hasFunction: false`, `club_inputs` no existe todavía. */
function fakeClient(hasFunction: boolean) {
  const requests: string[] = [];
  const tables: Record<string, unknown[]> = { club_members: members, profiles, player_stats: [], daily_activity: activity };
  const from = (table: string) => {
    let data: unknown = tables[table];
    const query = {
      select(columns: string) {
        if (columns === 'clubs(*)') data = { clubs: club };
        return query;
      },
      eq: () => query,
      in: () => query,
      gte: () => query,
      maybeSingle: () => query,
      then(resolve: (r: unknown) => void) {
        requests.push(table);
        resolve({ data, error: null });
      },
    };
    return query;
  };
  const rpc = async (name: string) => {
    requests.push(`rpc:${name}`);
    if (!hasFunction) return { data: null, error: { code: 'PGRST202', message: 'no existe' } };
    return { data: members.map((m) => ({ ...m, profile: profiles.find((p) => p.id === m.user_id), stats: null, activity: activity.filter((a) => a.user_id === m.user_id) })), error: null };
  };
  const auth = { getSession: async () => ({ data: { session: { user: { id: 'yo', email: 'yo@test.com' } } } }), onAuthStateChange: () => undefined };
  const client = { auth, from, rpc } as unknown as SupabaseClient;
  return { requests, repo: createSupabaseRepository({ client, now: () => DAY, pool: async () => [] }) };
}

describe('ranking con Supabase', () => {
  it('con la función SQL pide el club y todo lo demás en dos consultas', async () => {
    const { repo, requests } = fakeClient(true);
    const rows = await repo.getLeaderboard('week', 'puzzles');
    expect(rows.map((r) => [r.member.name, r.value, r.rank])).toEqual([
      ['Ana', 7, 1],
      ['Yo', 0, 2],
    ]);
    expect(requests).toEqual(['club_members', 'rpc:club_inputs']);
  });

  it('sin la función SQL sigue pidiendo tabla por tabla, y no vuelve a intentarlo', async () => {
    const { repo, requests } = fakeClient(false);
    const rows = await repo.getLeaderboard('week', 'puzzles');
    expect(rows[0].member).toMatchObject({ id: 'ana', name: 'Ana', motto: 'Jaque' });
    expect(rows[0].value).toBe(7);
    expect(requests).toEqual(['club_members', 'rpc:club_inputs', 'club_members', 'profiles', 'player_stats', 'daily_activity']);
    await repo.leaveClub().catch(() => undefined);
    await repo.getMembers();
    expect(requests.filter((r) => r === 'rpc:club_inputs')).toHaveLength(1);
  });
});

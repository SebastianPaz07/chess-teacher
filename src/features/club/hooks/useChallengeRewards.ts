import { useEffect } from 'react';
import { celebrate } from '@/features/gamification/components/RewardsCenter';
import type { Challenge } from '@/services/club';
import { useClubClaimsStore } from '@/store/clubStore';
import { useGameStore } from '@/store/gameStore';

/**
 * Cobra la XP de los retos ya decididos (una sola vez por reto).
 * Es revancha ganada si el reto era revancha de uno que perdí.
 */
export function useChallengeRewards(challenges: Challenge[] | undefined, meId: string) {
  const dispatch = useGameStore((s) => s.dispatch);
  const claim = useClubClaimsStore((s) => s.claimChallenge);
  useEffect(() => {
    if (!challenges || !meId) return;
    for (const c of challenges) {
      if (c.status !== 'done' || !c.results.some((r) => r.memberId === meId)) continue;
      if (!claim(c.id)) continue;
      const won = c.winnerId === undefined ? null : c.winnerId === null ? null : c.winnerId === meId;
      const prev = c.rematchOf ? challenges.find((x) => x.id === c.rematchOf) : undefined;
      const revenge = Boolean(won && prev && prev.winnerId && prev.winnerId !== meId);
      dispatch({ type: 'CHALLENGE_FINISHED', challengeId: c.id, won, solved: c.results.find((r) => r.memberId === meId)?.solved ?? 0, revenge });
      if (won) celebrate(revenge ? 'big' : 'small');
    }
  }, [challenges, meId, claim, dispatch]);
}

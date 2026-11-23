import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { todayKey } from '@/lib/date';
import { isDue, newCard, review, type Quality, type ReviewCard } from '@/services/scheduler/sm2';
import { storeKey, zustandStorage } from '@/services/storage/localStorageAdapter';

interface ReviewState {
  cards: Record<string, ReviewCard>;
  addCard: (kind: ReviewCard['kind'], ref: string) => void;
  grade: (cardId: string, quality: Quality) => void;
  dueCards: () => ReviewCard[];
}

export const useReviewStore = create<ReviewState>()(
  persist(
    (set, get) => ({
      cards: {},
      addCard: (kind, ref) => {
        const card = newCard(kind, ref, todayKey());
        if (get().cards[card.id]) return;
        set((s) => ({ cards: { ...s.cards, [card.id]: card } }));
      },
      grade: (cardId, quality) => {
        const card = get().cards[cardId];
        if (!card) return;
        set((s) => ({ cards: { ...s.cards, [cardId]: review(card, quality, todayKey()) } }));
      },
      dueCards: () => {
        const today = todayKey();
        return Object.values(get().cards)
          .filter((c) => isDue(c, today))
          .sort((a, b) => a.due.localeCompare(b.due));
      },
    }),
    { name: storeKey('review'), storage: zustandStorage, version: 1 },
  ),
);

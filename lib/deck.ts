import { Card, Suit, Rank, SUITS, RANKS } from './types';

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, id: `${suit}${rank}` });
    }
  }
  return deck;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function deal(deck: Card[], n: number): { hand: Card[]; remaining: Card[] } {
  return { hand: deck.slice(0, n), remaining: deck.slice(n) };
}

export function createShuffledHands(): { playerHand: Card[]; cpuHand: Card[]; remainingDeck: Card[] } {
  const deck = shuffle(createDeck());
  const playerHand = deck.slice(0, 9);
  const cpuHand = deck.slice(9, 18);
  const remainingDeck = deck.slice(18);
  return { playerHand, cpuHand, remainingDeck };
}

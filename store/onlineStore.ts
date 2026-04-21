import { create } from 'zustand';
import { Card } from '@/lib/types';

export type OnlineRole = 'host' | 'guest';
export type OnlinePhase =
  | 'LOBBY'
  | 'WAITING_FOR_GUEST'  // ホストがゲストの参加を待っている
  | 'MULLIGAN'
  | 'WAITING_FOR_MULLIGAN' // マリガン完了済み、相手待ち
  | 'SELECTING'
  | 'WAITING'     // 自分は選択済み、相手待ち
  | 'PLACED'
  | 'REVEALING'
  | 'RESOLVING'
  | 'NEXT_ROUND'
  | 'GAME_OVER';

export type OnlineGridCell = {
  owner: 'host' | 'guest' | 'tie' | null;
  hostCard: Card | null;
  guestCard: Card | null;
  suitMatch: boolean;
};

export interface OnlineSharedState {
  round: number;
  phase: string;
  grid: OnlineGridCell[];
  hostScore: number;
  guestScore: number;
  winner: 'host' | 'guest' | 'draw' | null;
  lastResult: 'host' | 'guest' | 'tie' | null;
  lastSuitMatch: boolean;
  pendingDraw: string | null;
  host_waiting?: boolean;
  guest_waiting?: boolean;
  guestJoined?: boolean;
  hostHandCount?: number;
  guestHandCount?: number;
  hostDiscard?: Card[];
  guestDiscard?: Card[];
  resigned?: string;
  rematch_host?: boolean;
  rematch_guest?: boolean;
  left_host?: boolean;
  left_guest?: boolean;
}

interface OnlineStore {
  roomCode: string | null;
  playerId: string | null;
  role: OnlineRole | null;

  myHand: Card[];
  selectedCard: Card | null;

  shared: OnlineSharedState | null;
  localPhase: OnlinePhase;

  mulliganSelected: Set<string>;
  myMulliganDone: boolean;

  setRoom: (roomCode: string, playerId: string, role: OnlineRole, hand: Card[]) => void;
  setShared: (shared: OnlineSharedState) => void;
  setSelectedCard: (card: Card | null) => void;
  setLocalPhase: (phase: OnlinePhase) => void;
  toggleMulliganCard: (cardId: string) => void;
  setMyMulliganDone: (done: boolean) => void;
  reset: () => void;
}

const EMPTY_SHARED: OnlineSharedState = {
  round: 1,
  phase: 'MULLIGAN',
  grid: Array(9).fill(null).map(() => ({
    owner: null, hostCard: null, guestCard: null, suitMatch: false,
  })),
  hostScore: 0,
  guestScore: 0,
  winner: null,
  lastResult: null,
  lastSuitMatch: false,
  pendingDraw: null,
};

export const useOnlineStore = create<OnlineStore>((set, get) => ({
  roomCode: null,
  playerId: null,
  role: null,
  myHand: [],
  selectedCard: null,
  shared: null,
  localPhase: 'LOBBY',
  mulliganSelected: new Set(),
  myMulliganDone: false,

  setRoom: (roomCode, playerId, role, hand) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('gridDuelSession', JSON.stringify({ roomCode, playerId, role }));
    }
    set({
      roomCode, playerId, role, myHand: hand,
      localPhase: role === 'host' ? 'WAITING_FOR_GUEST' : 'MULLIGAN',
      shared: EMPTY_SHARED,
      myMulliganDone: false,
    });
  },

  setShared: (shared) => {
    const prev = get().shared;
    const role = get().role;
    const myMulliganDone = get().myMulliganDone;
    const localPhase = get().localPhase;

    // ゲスト参加検知（ホストが待機中）
    if (shared.guestJoined && localPhase === 'WAITING_FOR_GUEST') {
      set({ shared, localPhase: 'MULLIGAN' });
      return;
    }

    // 再戦確定: GAME_OVER → MULLIGAN
    if (shared.phase === 'MULLIGAN' && localPhase === 'GAME_OVER') {
      set({ shared, localPhase: 'MULLIGAN', myHand: [], myMulliganDone: false, mulliganSelected: new Set() });
      return;
    }

    // 両者マリガン完了 → SELECTING
    if (shared.phase === 'SELECTING' && prev?.phase !== 'SELECTING') {
      set({ shared, localPhase: 'SELECTING' });
      return;
    }

    // PLACED or GAME_OVER: round が変わった → アニメーション発火
    // GAME_OVER も最終ラウンドのアニメーションを再生するため PLACED 扱い
    const isNewPlaced = (shared.phase === 'PLACED' || shared.phase === 'GAME_OVER') &&
      (prev?.phase !== 'PLACED' && prev?.phase !== 'GAME_OVER' || prev?.round !== shared.round);
    if (isNewPlaced) {
      set({ shared, localPhase: 'PLACED' });
      return;
    }

    set({ shared });
  },

  setSelectedCard: (card) => set({ selectedCard: card }),
  setLocalPhase: (phase) => set({ localPhase: phase }),

  toggleMulliganCard: (cardId) => {
    const prev = get().mulliganSelected;
    const next = new Set(prev);
    next.has(cardId) ? next.delete(cardId) : next.add(cardId);
    set({ mulliganSelected: next });
  },

  setMyMulliganDone: (done) => set({ myMulliganDone: done }),

  reset: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('gridDuelSession');
    }
    set({
      roomCode: null, playerId: null, role: null,
      myHand: [], selectedCard: null, shared: null,
      localPhase: 'LOBBY', mulliganSelected: new Set(), myMulliganDone: false,
    });
  },
}));

import { create } from 'zustand';
import { Card, GameState, GridCell } from '@/lib/types';
import { createShuffledHands } from '@/lib/deck';
import { applyRound, calcScore, isGameOver, determineWinner } from '@/lib/engine';
import { chooseCpuCard } from '@/lib/ai';

const EMPTY_GRID: GridCell[] = Array(9).fill(null).map(() => ({
  owner: null,
  playerCard: null,
  cpuCard: null,
  suitMatch: false,
}));

function makeInitialState(): GameState {
  const { playerHand, cpuHand, remainingDeck } = createShuffledHands();
  return {
    round: 1,
    phase: 'MULLIGAN',
    playerHand,
    cpuHand,
    selectedCard: null,
    cpuSelectedCard: null,
    grid: structuredClone(EMPTY_GRID),
    playerScore: 0,
    cpuScore: 0,
    winner: null,
    lastResult: null,
    lastSuitMatch: false,
    playerMulliganed: false,
    cpuMulliganed: false,
    remainingDeck,
    pendingDraw: { player: false, cpu: false },
    mulliganDiscardPlayer: [],
    mulliganDiscardCpu: [],
  };
}

interface GameStore extends GameState {
  mulligan: (selectedCardIds: string[]) => void;
  passMulligan: () => void;
  selectCard: (card: Card) => void;
  advancePhase: () => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...makeInitialState(),

  // マリガン: 選択したカードだけ引き直す
  mulligan: (selectedCardIds: string[]) => {
    const { phase, playerHand, cpuHand, remainingDeck } = get();
    if (phase !== 'MULLIGAN') return;

    let newDeck = [...remainingDeck];

    // --- player: 選択したカードを残りデッキ先頭から交換 ---
    const discardPlayer = playerHand.filter((c) => selectedCardIds.includes(c.id));
    const drawnPlayer = newDeck.splice(0, selectedCardIds.length);
    const newPlayerHand = [
      ...playerHand.filter((c) => !selectedCardIds.includes(c.id)),
      ...drawnPlayer,
    ];

    // --- CPU: rank < 7 を全部入れ替え ---
    const discardCpu = cpuHand.filter((c) => c.rank < 7);
    const drawnCpu = newDeck.splice(0, discardCpu.length);
    const newCpuHand = [
      ...cpuHand.filter((c) => c.rank >= 7),
      ...drawnCpu,
    ];

    set({
      phase: 'SELECTING',
      playerHand: newPlayerHand,
      cpuHand: newCpuHand,
      remainingDeck: newDeck,
      playerMulliganed: selectedCardIds.length > 0,
      cpuMulliganed: discardCpu.length > 0,
      mulliganDiscardPlayer: discardPlayer,
      mulliganDiscardCpu: discardCpu,
    });
  },

  // マリガンをパスしてゲーム開始（CPU だけ判定）
  passMulligan: () => {
    const { phase, cpuHand, remainingDeck } = get();
    if (phase !== 'MULLIGAN') return;

    let newDeck = [...remainingDeck];
    const discardCpu = cpuHand.filter((c) => c.rank < 7);
    const drawnCpu = newDeck.splice(0, discardCpu.length);
    const newCpuHand = [
      ...cpuHand.filter((c) => c.rank >= 7),
      ...drawnCpu,
    ];

    set({
      phase: 'SELECTING',
      cpuHand: newCpuHand,
      remainingDeck: newDeck,
      cpuMulliganed: discardCpu.length > 0,
      mulliganDiscardCpu: discardCpu,
    });
  },

  // カード選択と同時にCPUも決定 → 伏せ配置（PLACED）へ
  selectCard: (card) => {
    const { phase, cpuHand, grid, round } = get();
    if (phase !== 'SELECTING') return;

    const cellIndex = round - 1;
    const cpuCard = chooseCpuCard(cpuHand, grid, cellIndex);

    // REVEALING フェーズで正しい結果を表示するため先計算
    const tempGrid = applyRound(grid, cellIndex, card, cpuCard);
    const cell = tempGrid[cellIndex];
    const previewResult: 'player' | 'cpu' | 'tie' =
      cell.owner === 'player' ? 'player' : cell.owner === 'cpu' ? 'cpu' : 'tie';

    set({
      selectedCard: card,
      cpuSelectedCard: cpuCard,
      phase: 'PLACED',
      lastResult: previewResult,
      lastSuitMatch: cell.suitMatch,
    });
  },

  advancePhase: () => {
    const state = get();
    const { phase, round, selectedCard, cpuSelectedCard, grid, playerHand, cpuHand, remainingDeck } = state;

    if (phase === 'PLACED') {
      // 伏せカードが置かれた → フリップへ
      set({ phase: 'REVEALING' });
    } else if (phase === 'REVEALING') {
      if (!selectedCard || !cpuSelectedCard) return;

      const cellIndex = round - 1;
      const newGrid = applyRound(grid, cellIndex, selectedCard, cpuSelectedCard);
      const { player, cpu } = calcScore(newGrid);
      const cell = newGrid[cellIndex];
      const lastResult = cell.owner === 'player' ? 'player'
        : cell.owner === 'cpu' ? 'cpu' : 'tie';

      // 負けた側に pendingDraw をセット（デッキが残っている場合のみ）
      const willPlayerDraw = lastResult === 'cpu' && remainingDeck.length > 0;
      const willCpuDraw = lastResult === 'player' && remainingDeck.length > 0;

      set({
        phase: 'RESOLVING',
        grid: newGrid,
        playerScore: player,
        cpuScore: cpu,
        lastResult,
        lastSuitMatch: cell.suitMatch,
        pendingDraw: { player: willPlayerDraw, cpu: willCpuDraw },
      });
    } else if (phase === 'RESOLVING') {
      set({ phase: 'NEXT_ROUND' });
    } else if (phase === 'NEXT_ROUND') {
      const nextRound = round + 1;
      if (isGameOver(nextRound)) {
        set({ phase: 'GAME_OVER', winner: determineWinner(state.playerScore, state.cpuScore) });
        return;
      }

      const { pendingDraw } = state;
      let newPlayerHand = playerHand.filter((c) => c.id !== selectedCard?.id);
      let newCpuHand = cpuHand.filter((c) => c.id !== cpuSelectedCard?.id);
      let newDeck = [...remainingDeck];

      // 負けた側がドロー（中身は非公開）
      if (pendingDraw.player && newDeck.length > 0) {
        newPlayerHand = [...newPlayerHand, newDeck.shift()!];
      } else if (pendingDraw.cpu && newDeck.length > 0) {
        newCpuHand = [...newCpuHand, newDeck.shift()!];
      }

      set({
        phase: 'SELECTING',
        round: nextRound,
        selectedCard: null,
        cpuSelectedCard: null,
        playerHand: newPlayerHand,
        cpuHand: newCpuHand,
        remainingDeck: newDeck,
        pendingDraw: { player: false, cpu: false },
      });
    }
  },

  resetGame: () => set(makeInitialState()),
}));

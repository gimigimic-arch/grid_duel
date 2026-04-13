import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';

/**
 * フェーズの自動進行を管理するフック
 *
 * REVEALING → (1200ms) → RESOLVING → (700ms) → NEXT_ROUND → (500ms or 1800ms) → SELECTING
 * ドロー発生時は NEXT_ROUND を 1800ms に延長して通知を見せる
 */
export function useGameLoop() {
  const phase = useGameStore((s) => s.phase);
  const pendingDraw = useGameStore((s) => s.pendingDraw);
  const advancePhase = useGameStore((s) => s.advancePhase);

  useEffect(() => {
    if (phase === 'REVEALING') {
      const t = setTimeout(() => advancePhase(), 1200);
      return () => clearTimeout(t);
    }
    if (phase === 'RESOLVING') {
      const t = setTimeout(() => advancePhase(), 700);
      return () => clearTimeout(t);
    }
    if (phase === 'NEXT_ROUND') {
      const hasDraw = pendingDraw.player || pendingDraw.cpu;
      const t = setTimeout(() => advancePhase(), hasDraw ? 1800 : 500);
      return () => clearTimeout(t);
    }
  }, [phase, pendingDraw, advancePhase]);
}

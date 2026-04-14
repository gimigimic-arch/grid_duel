import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';

/**
 * フェーズの自動進行を管理するフック
 *
 * PLACED → (600ms) → REVEALING → (1400ms) → RESOLVING → (700ms) → NEXT_ROUND → (500ms or 1800ms) → SELECTING
 */
export function useGameLoop() {
  const phase = useGameStore((s) => s.phase);
  const pendingDraw = useGameStore((s) => s.pendingDraw);
  const advancePhase = useGameStore((s) => s.advancePhase);

  useEffect(() => {
    if (phase === 'PLACED') {
      // DUEL! 演出を見せる時間 → フリップへ
      const t = setTimeout(() => advancePhase(), 1200);
      return () => clearTimeout(t);
    }
    if (phase === 'REVEALING') {
      // RevealOverlay を表示する時間（フリップ + 勝敗テキスト表示）
      const t = setTimeout(() => advancePhase(), 1400);
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

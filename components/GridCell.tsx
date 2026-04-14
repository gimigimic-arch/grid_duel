'use client';

import { GridCell as GridCellType, CENTER_INDEX } from '@/lib/types';
import { motion, type TargetAndTransition } from 'framer-motion';
import PlayingCard from './PlayingCard';

interface Props {
  cell: GridCellType;
  index: number;
  isCurrent: boolean;
  isRevealing: boolean;
  winnerLines: number[][];
}

export default function GridCellComponent({ cell, index, isCurrent, isRevealing, winnerLines }: Props) {
  const isCenter = index === CENTER_INDEX;
  const isInWinnerLine = winnerLines.some((line) => line.includes(index));
  const isCaptured = !!cell.owner;

  const isPlayerWin = cell.owner === 'player';
  const isCpuWin    = cell.owner === 'cpu';
  const isTie       = cell.owner === 'tie';

  // 明暗だけで区別する1軸デザイン
  // 自分が取った → 明るく光る（スート一致はさらにゴールド）
  // 落とした    → 暗く沈む
  // 引き分け    → グレー
  // 現在マス    → 緑ハイライト
  // ライン成立  → 黄色い輝き（上書き）
  let bgClass: string;
  let glowAnim: TargetAndTransition | undefined;

  if (isInWinnerLine && isPlayerWin) {
    bgClass = 'bg-white/15 border-yellow-300';
    glowAnim = { boxShadow: ['0 0 0px #fde047', '0 0 18px #fde047', '0 0 0px #fde047'] };
  } else if (isInWinnerLine && isCpuWin) {
    bgClass = 'bg-slate-900/80 border-yellow-800';
    glowAnim = { boxShadow: ['0 0 0px #854d0e', '0 0 8px #854d0e', '0 0 0px #854d0e'] };
  } else if (isPlayerWin && cell.suitMatch) {
    bgClass = 'bg-yellow-200/20 border-yellow-300';
    glowAnim = { boxShadow: ['0 0 4px #fde047', '0 0 14px #fde047', '0 0 4px #fde047'] };
  } else if (isPlayerWin) {
    bgClass = 'bg-white/10 border-slate-300';
  } else if (isCpuWin && cell.suitMatch) {
    bgClass = 'bg-slate-950/90 border-slate-700';
  } else if (isCpuWin) {
    bgClass = 'bg-slate-950/90 border-slate-800';
  } else if (isTie) {
    bgClass = 'bg-slate-800/40 border-slate-700';
  } else if (isCurrent) {
    bgClass = 'bg-emerald-900/40 border-emerald-400';
  } else {
    bgClass = 'bg-slate-800/30 border-slate-700';
  }

  return (
    <motion.div
      className={`
        relative rounded-xl border-2 flex flex-col items-center justify-center gap-1
        ${bgClass} transition-colors duration-300
      `}
      style={{ minHeight: 110 }}
      animate={glowAnim}
      transition={{ duration: 1.2, repeat: Infinity }}
    >
      {/* センター0ptラベル */}
      {isCenter && !isCaptured && (
        <span className="absolute top-1 right-1 text-[10px] text-slate-600 font-mono">0pt</span>
      )}

      {/* スート一致バッジ */}
      {cell.suitMatch && isCaptured && (
        <span className={`absolute top-1 left-1 text-[10px] font-bold ${isPlayerWin ? 'text-yellow-400' : 'text-slate-500'}`}>
          ✦2pt
        </span>
      )}

      {/* 空マス */}
      {!isCaptured && (
        <span className="text-slate-700 text-2xl select-none">
          {isCurrent ? '▶' : '·'}
        </span>
      )}

      {/* カード表示 — 自分が取ったマスは明るく、落としたマスは暗く */}
      {isCaptured && cell.playerCard && cell.cpuCard && (
        <div className={`flex gap-1 items-center ${isCpuWin ? 'opacity-40' : 'opacity-90'}`}>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[9px] text-slate-500 font-mono">CPU</span>
            <FlipCard card={cell.cpuCard} delay={0} />
          </div>
          <span className="text-slate-600 text-xs">vs</span>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-[9px] text-slate-500 font-mono">YOU</span>
            <FlipCard card={cell.playerCard} delay={0.15} />
          </div>
        </div>
      )}

    </motion.div>
  );
}

function FlipCard({ card, delay }: { card: import('@/lib/types').Card; delay: number }) {
  return (
    <motion.div
      initial={{ rotateY: 90, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ delay, duration: 0.35, ease: 'easeOut' }}
      style={{ perspective: 600 }}
    >
      <PlayingCard card={card} small />
    </motion.div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { GridCell, LINES } from '@/lib/types';
import ShareButtons from './ShareButtons';

interface Props {
  winner: 'player' | 'cpu' | 'draw';
  playerScore: number;
  cpuScore: number;
  grid: GridCell[];
  onRestart: () => void;
}

function countLinesFor(grid: GridCell[], owner: 'player' | 'cpu'): number {
  return LINES.filter((line) => line.every((i) => grid[i].owner === owner)).length;
}

export default function GameOverModal({ winner, playerScore, cpuScore, grid, onRestart }: Props) {
  const router = useRouter();
  const playerLines = countLinesFor(grid, 'player');
  const cpuLines = countLinesFor(grid, 'cpu');

  const message =
    winner === 'player' ? '🎉 YOU WIN!' : winner === 'cpu' ? '💀 CPU WINS' : '🤝 DRAW';
  const msgColor =
    winner === 'player' ? 'text-yellow-400' : winner === 'cpu' ? 'text-red-400' : 'text-slate-300';

  return (
    <motion.div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="bg-slate-900 border border-slate-600 rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
      >
        <div className={`text-4xl font-bold mb-4 ${msgColor}`}>{message}</div>

        <div className="flex justify-around mb-6">
          <div>
            <div className="text-4xl font-bold text-blue-400">{playerScore}</div>
            <div className="text-xs text-slate-400">YOU</div>
            <div className="text-xs text-slate-500">{playerLines} line{playerLines !== 1 ? 's' : ''}</div>
          </div>
          <div className="text-slate-600 text-2xl self-center">vs</div>
          <div>
            <div className="text-4xl font-bold text-red-400">{cpuScore}</div>
            <div className="text-xs text-slate-400">CPU</div>
            <div className="text-xs text-slate-500">{cpuLines} line{cpuLines !== 1 ? 's' : ''}</div>
          </div>
        </div>

        <button
          onClick={onRestart}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg transition-colors"
        >
          もう一度
        </button>

        <button
          onClick={() => router.push('/online')}
          className="w-full mt-3 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-base transition-colors"
        >
          友達と対戦する
        </button>

        <div className="pt-1">
          <ShareButtons
            text={buildShareText(winner, playerScore, cpuScore)}
            url={typeof window !== 'undefined' ? `${window.location.origin}/online` : '/online'}
            label="結果をシェア"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

function buildShareText(
  winner: 'player' | 'cpu' | 'draw',
  playerScore: number,
  cpuScore: number
): string {
  const result =
    winner === 'player' ? '勝利' : winner === 'cpu' ? '敗北' : '引き分け';
  const mark = winner === 'cpu' ? '...' : '！';
  return `GRID DUELでCPUに${result}${mark}（${playerScore}pt vs ${cpuScore}pt）\n一緒にやろう！`;
}

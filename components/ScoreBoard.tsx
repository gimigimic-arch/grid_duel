'use client';

import { motion } from 'framer-motion';

interface Props {
  playerScore: number;
  cpuScore: number;
  round: number;
  playerLabel?: string;
  opponentLabel?: string;
}

export default function ScoreBoard({ playerScore, cpuScore, round, playerLabel = 'YOU', opponentLabel = 'CPU' }: Props) {
  const total = playerScore + cpuScore;
  // プレイヤー側バー幅（%）: 0〜100
  const playerPct = total === 0 ? 50 : Math.round((playerScore / total) * 100);
  const cpuPct = 100 - playerPct;

  const diff = playerScore - cpuScore;
  const advantage =
    diff > 2 ? 'text-blue-400' :
    diff < -2 ? 'text-red-400' :
    'text-slate-400';

  return (
    <div className="w-full max-w-sm mx-auto px-2 space-y-1">
      {/* スコア行 */}
      <div className="flex items-center justify-between">
        <div className="text-center w-16">
          <div className="text-3xl font-bold text-blue-400">{playerScore}</div>
          <div className="text-xs text-slate-500 font-mono">{playerLabel}</div>
        </div>

        <div className="text-center flex-1">
          <div className="text-slate-400 text-xs font-mono">Round</div>
          <div className={`text-xl font-bold ${advantage}`}>{Math.min(round, 9)} / 9</div>
        </div>

        <div className="text-center w-16">
          <div className="text-3xl font-bold text-red-400">{cpuScore}</div>
          <div className="text-xs text-slate-500 font-mono">{opponentLabel}</div>
        </div>
      </div>

      {/* 優勢バー */}
      <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden flex">
        <motion.div
          className="h-full bg-blue-500 rounded-full"
          animate={{ width: `${playerPct}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
        <motion.div
          className="h-full bg-red-500 rounded-full"
          animate={{ width: `${cpuPct}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

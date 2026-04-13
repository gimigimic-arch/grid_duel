'use client';

interface Props {
  playerScore: number;
  cpuScore: number;
  round: number;
}

export default function ScoreBoard({ playerScore, cpuScore, round }: Props) {
  return (
    <div className="flex items-center justify-between w-full max-w-sm mx-auto px-2">
      <div className="text-center">
        <div className="text-3xl font-bold text-blue-400">{playerScore}</div>
        <div className="text-xs text-slate-400 font-mono">YOU</div>
      </div>

      <div className="text-center">
        <div className="text-slate-400 text-sm font-mono">Round</div>
        <div className="text-xl font-bold text-slate-200">{Math.min(round, 9)} / 9</div>
      </div>

      <div className="text-center">
        <div className="text-3xl font-bold text-red-400">{cpuScore}</div>
        <div className="text-xs text-slate-400 font-mono">CPU</div>
      </div>
    </div>
  );
}

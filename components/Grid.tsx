'use client';

import { GridCell, LINES } from '@/lib/types';
import GridCellComponent from './GridCell';

interface Props {
  grid: GridCell[];
  currentRound: number;
  isRevealing: boolean;
  myCardPendingIndex?: number;
  opponentCardPendingIndex?: number;
  opponentLabel?: string;
}

export default function Grid({ grid, currentRound, isRevealing, myCardPendingIndex, opponentCardPendingIndex, opponentLabel }: Props) {
  const currentCellIndex = currentRound - 1;

  // 完成したラインを計算（ゲーム全体で表示）
  const winnerLines: number[][] = [];
  for (const line of LINES) {
    const owners = line.map((i) => grid[i].owner);
    if (owners[0] && owners[0] !== 'tie' && owners.every((o) => o === owners[0])) {
      winnerLines.push(line);
    }
  }

  return (
    <div className="grid grid-cols-3 gap-2 w-full max-w-sm mx-auto">
      {grid.map((cell, i) => (
        <GridCellComponent
          key={i}
          cell={cell}
          index={i}
          isCurrent={i === currentCellIndex}
          isRevealing={isRevealing && i === currentCellIndex}
          winnerLines={winnerLines}
          myCardPending={myCardPendingIndex !== undefined && i === myCardPendingIndex}
          opponentCardPending={opponentCardPendingIndex !== undefined && i === opponentCardPendingIndex}
          opponentLabel={opponentLabel}
        />
      ))}
    </div>
  );
}

import { Card, GridCell, CellOwner, CENTER_INDEX, LINES } from './types';

/**
 * スート完全一致かどうか
 */
export function isSuitMatch(a: Card, b: Card): boolean {
  return a.suit === b.suit;
}

/**
 * 2枚のカードを比較して勝者を返す（純粋関数）
 *
 * ルール:
 *   スート一致 → 低い方が勝ち（2点）
 *   それ以外   → 高い方が勝ち（1点 / センター0点）
 *   同値       → 引き分け
 */
export function compareCards(a: Card, b: Card): 'a' | 'b' | 'tie' {
  if (a.rank === b.rank) return 'tie';
  if (isSuitMatch(a, b)) {
    return a.rank < b.rank ? 'a' : 'b'; // スート一致: 低い方勝ち
  } else {
    return a.rank > b.rank ? 'a' : 'b'; // 通常: 高い方勝ち
  }
}

/**
 * 盤面上の owner 別ラインボーナス数を返す
 */
export function countLines(grid: GridCell[], owner: 'player' | 'cpu'): number {
  let count = 0;
  for (const line of LINES) {
    if (line.every((i) => grid[i].owner === owner)) {
      count++;
    }
  }
  return count;
}

/**
 * 盤面のスコアを計算する
 * - スート一致で制圧: 2点（センターでも2点）
 * - 通常制圧: 1点（センターのみ0点）
 * - ライン完成: +1点
 */
export function calcScore(grid: GridCell[]): { player: number; cpu: number } {
  let player = 0;
  let cpu = 0;

  for (let i = 0; i < grid.length; i++) {
    const cell = grid[i];
    if (!cell.owner || cell.owner === 'tie') continue;

    let pts: number;
    if (i === CENTER_INDEX) {
      pts = 0; // センター: 常に0点（スート一致でも0点）
    } else {
      pts = cell.suitMatch ? 2 : 1; // 通常マス: スート一致2点、通常1点
    }

    if (cell.owner === 'player') player += pts;
    else cpu += pts;
  }

  player += countLines(grid, 'player');
  cpu += countLines(grid, 'cpu');

  return { player, cpu };
}

export function isGameOver(round: number): boolean {
  return round > 9;
}

export function determineWinner(
  playerScore: number,
  cpuScore: number
): 'player' | 'cpu' | 'draw' {
  if (playerScore > cpuScore) return 'player';
  if (cpuScore > playerScore) return 'cpu';
  return 'draw';
}

/**
 * ラウンド結果を適用して新しいグリッドを返す
 */
export function applyRound(
  grid: GridCell[],
  cellIndex: number,
  playerCard: Card,
  cpuCard: Card
): GridCell[] {
  const result = compareCards(playerCard, cpuCard);
  const owner: CellOwner =
    result === 'a' ? 'player' : result === 'b' ? 'cpu' : 'tie';
  const suitMatch = isSuitMatch(playerCard, cpuCard);

  const newGrid = [...grid];
  newGrid[cellIndex] = { owner, playerCard, cpuCard, suitMatch };
  return newGrid;
}

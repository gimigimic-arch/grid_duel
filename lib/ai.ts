import { Card, GridCell, LINES, CENTER_INDEX } from './types';
import { compareCards, countLines } from './engine';
import { createDeck } from './deck';

/**
 * あるマスを取るとラインボーナスにどれだけ貢献するかを返す（0〜最大4）
 */
function getLineValue(cellIndex: number, grid: GridCell[], owner: 'cpu' | 'player'): number {
  let value = 0;
  for (const line of LINES) {
    if (!line.includes(cellIndex)) continue;
    const others = line.filter((i) => i !== cellIndex);
    // 他2マスが全て自分のものなら完成ライン、1つなら可能性あり
    const owned = others.filter((i) => grid[i].owner === owner).length;
    const blocked = others.filter((i) => grid[i].owner !== null && grid[i].owner !== owner).length;
    if (blocked === 0) value += owned + 1;
  }
  return value;
}

/**
 * CPU がカードを選ぶ
 *
 * 戦略:
 * 1. スコアリング関数で各カードを評価して最高スコアを選ぶ
 * 2. 評価基準:
 *    - このマスの勝利可能性
 *    - ラインへの貢献度
 *    - 強いカードの節約（最小コスト勝利）
 * 3. 10%の確率でランダムに選ぶ（人間らしさ）
 */
export function chooseCpuCard(
  cpuHand: Card[],
  grid: GridCell[],
  cellIndex: number
): Card {
  // 10% ランダム
  if (Math.random() < 0.1) {
    return cpuHand[Math.floor(Math.random() * cpuHand.length)];
  }

  const lineValue = getLineValue(cellIndex, grid, 'cpu');
  const isCenterCell = cellIndex === CENTER_INDEX;
  const cellImportance = isCenterCell ? lineValue * 1.5 : lineValue + (cellIndex !== CENTER_INDEX ? 1 : 0);

  // 既出カードと自分の手札を除いた「プレイヤーが持ちうるカード」を推定
  const knownIds = new Set<string>([
    ...cpuHand.map((c) => c.id),
    ...grid.flatMap((c) => [c.playerCard?.id, c.cpuCard?.id]).filter(Boolean) as string[],
  ]);
  const playerPossibleCards = createDeck().filter((c) => !knownIds.has(c.id));

  let bestCard = cpuHand[0];
  let bestScore = -Infinity;

  for (const card of cpuHand) {

    // このカードで何枚に勝てるか / 何枚に負けるか
    let wins = 0;
    let losses = 0;
    for (const pc of playerPossibleCards) {
      const r = compareCards(card, pc);
      if (r === 'a') wins++;
      else if (r === 'b') losses++;
    }
    const total = playerPossibleCards.length || 1;
    const winRate = wins / total;

    // 強さのコスト（弱いカードで勝てるなら強いカードを温存）
    const cardCost = card.rank / 14;

    // スコア = 勝率 × マス重要度 − カードコスト × 調整
    const score = winRate * (cellImportance + 1) - cardCost * 0.3 + Math.random() * 0.05;

    if (score > bestScore) {
      bestScore = score;
      bestCard = card;
    }
  }

  return bestCard;
}

export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14; // 11=J, 12=Q, 13=K, 14=A

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string; // e.g. "♠14"
}

export type CellOwner = 'player' | 'cpu' | 'tie' | null;

export interface GridCell {
  owner: CellOwner;
  playerCard: Card | null;
  cpuCard: Card | null;
  suitMatch: boolean; // スート一致フラグ（2点の場合true）
}

export type GamePhase =
  | 'MULLIGAN'    // ゲーム開始前のマリガンフェーズ
  | 'SELECTING'   // プレイヤーが手札から選択中
  | 'REVEALING'   // 両カードをフリップ中
  | 'RESOLVING'   // 勝敗判定・グリッド更新
  | 'NEXT_ROUND'  // 次ラウンドへの待機
  | 'GAME_OVER';  // ゲーム終了

export interface GameState {
  round: number;           // 1〜9
  phase: GamePhase;
  playerHand: Card[];
  cpuHand: Card[];
  selectedCard: Card | null;
  cpuSelectedCard: Card | null;
  grid: GridCell[];        // 9要素、インデックス0〜8（左上から右下）
  playerScore: number;
  cpuScore: number;
  winner: 'player' | 'cpu' | 'draw' | null;
  lastResult: 'player' | 'cpu' | 'tie' | null;
  lastSuitMatch: boolean;  // 直前ラウンドがスート一致だったか
  playerMulliganed: boolean;
  cpuMulliganed: boolean;
  remainingDeck: Card[];                          // マリガン後の残りデッキ（ドロー源）
  pendingDraw: { player: boolean; cpu: boolean }; // 次の NEXT_ROUND でドローする側
  mulliganDiscardPlayer: Card[];                  // プレイヤーがマリガンで捨てたカード（公開）
  mulliganDiscardCpu: Card[];                     // CPU がマリガンで捨てたカード（公開）
}

export const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
export const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

export const RANK_LABEL: Record<Rank, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
  11: 'J', 12: 'Q', 13: 'K', 14: 'A',
};

export const CENTER_INDEX = 4; // 3×3 グリッドの中央

// ラインの組み合わせ（インデックス）
export const LINES = [
  [0, 1, 2], // 上段横
  [3, 4, 5], // 中段横
  [6, 7, 8], // 下段横
  [0, 3, 6], // 左列縦
  [1, 4, 7], // 中列縦
  [2, 5, 8], // 右列縦
  [0, 4, 8], // 左上〜右下斜え
  [2, 4, 6], // 右上〜左下斜え
];

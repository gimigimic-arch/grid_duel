# Grid Duel — 仕様書

## 概要

トランプ（標準52枚）を使った1v1バトルカードゲーム。3×3のグリッドを制圧しあうシンプルかつ戦略的なルールで、CPU戦とオンライン対人戦の両方に対応する。

- **ジャンル**: 対戦カードゲーム（ターン制・同時出し）
- **プラットフォーム**: ブラウザ（スマホ対応）
- **対戦形式**: CPU戦 / オンライン2人対戦

---

## ゲームルール

### 基本フロー

1. 52枚デッキをシャッフル → 各プレイヤーに **9枚** 配布（残りは予備デッキ）
2. マリガン: 好きな枚数を選んで1回だけ引き直し可能
3. 3×3グリッドの **9マスを左上→右下の固定順** で1マスずつ争う（9ラウンド）
4. 各ラウンド: 両者が手札から1枚を同時に伏せ → 同時公開 → 判定
5. 9ラウンド終了後、スコアが多い方の勝ち

### 勝敗判定（コアメカニクス）

| 条件 | 結果 |
|------|------|
| 同スート | **低い方** が制圧（スートマッチ） |
| 異スート | **高い方** が制圧 |
| 同ランク | 引き分け（そのマスは誰も取れない） |

**例:**
- K♠ vs 5♠ → 5♠ 勝ち（同スート、低い方）
- K♠ vs 5♥ → K♠ 勝ち（異スート、高い方）
- 2♠ vs A♥ → A♥ 勝ち（異スート、A=14で最強）
- A♠ vs 2♠ → 2♠ 勝ち（同スート、2が最低で最強）
- 7♠ vs 7♥ → 引き分け

### ランク定義

- **A = 14**（同スートで最弱、異スートで最強）
- 特殊ルールなし（絵札ルールも省いてシンプル一本）

### スコア計算

| 状況 | 点数 |
|------|------|
| 通常制圧（異スート） | **+1点** |
| スートマッチ制圧（同スート） | **+2点** |
| センターマス（インデックス4）制圧 | **0点**（ラインボーナスには貢献） |
| 縦・横・斜えいずれか3マスライン完成 | **+1点**（複数ライン可） |

### マリガン

- ゲーム開始前に **任意の枚数** を選んで引き直し（1回限り）
- 選択なしで「このまま開始」も可
- **CPUは自動**: ランク7未満のカードをすべて入れ替える
- マリガンで捨てたカードは **公開**（捨て札として画面に表示）

### ドロー on Loss

- ラウンドを負けた側が残りデッキから **1枚自動ドロー**
- ドローした中身は非公開（誰がドローしたかだけ通知）
- 引き分けラウンドはドローなし

---

## 技術スタック

| カテゴリ | 技術 |
|----------|------|
| フレームワーク | Next.js 14 (App Router) |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS |
| アニメーション | Framer Motion |
| 状態管理 | Zustand |
| リアルタイム通信 | Supabase Realtime (postgres_changes) |
| サーバーサイドKV | Vercel KV (ioredis) |
| データベース | Supabase (PostgreSQL) |
| デプロイ | Vercel |

---

## アーキテクチャ

### CPU戦

```
ブラウザ（Zustand）
  playerHand / cpuHand / grid / score / phase
  ↓
useGameLoop (setInterval/setTimeout)
  フェーズ自動進行: PLACING → REVEALING → RESOLVING → NEXT_ROUND
  ↓
engine.ts (純粋関数)
  compareCards / applyRound / calcScore
  ↓
ai.ts
  CPU カード選択（最小コスト勝利戦略）
```

すべてブラウザ内で完結。サーバー通信なし。

### オンライン対戦

```
Player A (ブラウザ)                Vercel API Route              Player B (ブラウザ)
  myHand (Zustand)                       ↑                         myHand (Zustand)
  POST cardId                   Redis: room:{code}:*_card           POST cardId
     ↓                                   ↓ 両者揃ったら
     └─── /api/rooms/[code]/select ──── engine.compareCards() ─────┘
                                          ↓ 結果のみ
                                   Supabase shared_state
                                          ↓ Realtime
                      PLACED → REVEALING → RESOLVING (両者の画面で同期)
```

**設計の核心:**
- 手札はブラウザのZustandのみに保持。ネットワークに送信しない
- 選択したカードIDだけAPIに送信 → サーバー側のRedisに一時保管
- 両者揃ったらサーバーがエンジンで計算 → 結果だけSupabaseにpush
- クライアントはRedisの中身を直接参照できない

---

## フェーズ設計

### CPU戦フェーズ (`GamePhase`)

```
MULLIGAN → SELECTING → PLACED → REVEALING → RESOLVING → NEXT_ROUND → SELECTING ...
                                                              ↓ (ラウンド9終了後)
                                                          GAME_OVER
```

| フェーズ | 説明 | 時間 |
|----------|------|------|
| MULLIGAN | マリガン画面 | ユーザー操作待ち |
| SELECTING | プレイヤーがカード選択中 | ユーザー操作待ち |
| PLACED | 両カードが伏せてグリッドに置かれた状態 | 1200ms |
| REVEALING | カードフリップ + 勝敗オーバーレイ表示 | 1400ms |
| RESOLVING | 勝敗判定・グリッド更新 | 700ms |
| NEXT_ROUND | 次ラウンドへの待機（ドロー通知含む） | 500ms / 1800ms(ドローあり) |
| GAME_OVER | ゲーム終了 | — |

### オンライン対戦フェーズ (`OnlinePhase`)

```
LOBBY → WAITING_FOR_GUEST(ホスト) / MULLIGAN(ゲスト)
             ↓ ゲスト参加検知
         MULLIGAN → WAITING_FOR_MULLIGAN → SELECTING → WAITING → PLACED → REVEALING → ...
```

| フェーズ | 説明 |
|----------|------|
| LOBBY | 初期状態 |
| WAITING_FOR_GUEST | ホストがゲストの参加を待っている |
| MULLIGAN | マリガン選択中 |
| WAITING_FOR_MULLIGAN | マリガン完了、相手待ち |
| SELECTING | カード選択中 |
| WAITING | 自分は選択済み、相手待ち |
| PLACED | 両者選択完了、伏せカード表示 |
| REVEALING | カードフリップアニメーション |
| RESOLVING | 結果確定 |
| NEXT_ROUND | 次ラウンド遷移 |
| GAME_OVER | ゲーム終了 |

---

## API エンドポイント一覧

| メソッド | エンドポイント | 処理 |
|----------|---------------|------|
| POST | `/api/rooms` | ルーム作成・ホスト手札生成 |
| POST | `/api/rooms/[code]/join` | ゲスト参加・ゲスト手札生成 |
| GET | `/api/rooms/[code]/hand` | 再接続時の手札取得 |
| POST | `/api/rooms/[code]/mulligan` | マリガン処理（サーバー側でカード交換） |
| POST | `/api/rooms/[code]/select` | カードID受信→Redis保存→両者揃ったら計算→Supabase push |
| POST | `/api/rooms/[code]/resign` | 投了処理 |
| POST | `/api/rooms/[code]/rematch` | 再戦リクエスト・確定時リセット |
| POST | `/api/rooms/[code]/leave` | ロビー離脱通知 |

---

## データ構造

### Card

```ts
interface Card {
  suit: '♠' | '♥' | '♦' | '♣';
  rank: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14; // 11=J, 12=Q, 13=K, 14=A
  id: string; // e.g. "♠14"
}
```

### GridCell（CPU戦）

```ts
interface GridCell {
  owner: 'player' | 'cpu' | 'tie' | null;
  playerCard: Card | null;
  cpuCard: Card | null;
  suitMatch: boolean;
}
```

### OnlineGridCell（オンライン）

```ts
type OnlineGridCell = {
  owner: 'host' | 'guest' | 'tie' | null;
  hostCard: Card | null;
  guestCard: Card | null;
  suitMatch: boolean;
};
```

### Supabase: rooms テーブル

```sql
create table rooms (
  code         text primary key,   -- 4文字英数字ルームコード
  host_id      text not null,      -- crypto.randomUUID()
  guest_id     text,               -- 参加者UUID
  shared_state jsonb not null,     -- グリッド・スコア・フェーズ・ラウンドなど
  host_ready   boolean default false,  -- マリガン完了フラグ
  guest_ready  boolean default false,
  updated_at   timestamptz default now()
);
```

### shared_state（Supabaseに保存されるJSON）

```ts
interface OnlineSharedState {
  round: number;
  phase: string;
  grid: OnlineGridCell[];
  hostScore: number;
  guestScore: number;
  winner: 'host' | 'guest' | 'draw' | null;
  lastResult: 'host' | 'guest' | 'tie' | null;
  lastSuitMatch: boolean;
  pendingDraw: string | null;
  guestJoined?: boolean;
  hostHandCount?: number;
  guestHandCount?: number;
  hostDiscard?: Card[];
  guestDiscard?: Card[];
  resigned?: string;           // 投了したプレイヤーID
  rematch_host?: boolean;      // ホストが再戦を希望
  rematch_guest?: boolean;     // ゲストが再戦を希望
  left_host?: boolean;         // ホストがロビーに戻った
  left_guest?: boolean;        // ゲストがロビーに戻った
}
```

### Redis キー

```
room:{code}:host_id       → ホストプレイヤーID（TTL: 1時間）
room:{code}:host_card     → ホストの選択カードID（解決後削除）
room:{code}:guest_card    → ゲストの選択カードID（解決後削除）
room:{code}:host_hand     → ホストの手札（Card[] JSON）
room:{code}:guest_hand    → ゲストの手札（Card[] JSON）
room:{code}:deck          → 残りデッキ（Card[] JSON）
```

---

## ファイル構成

```
grid-duel/
├── app/
│   ├── layout.tsx               # ルートレイアウト
│   ├── page.tsx                 # メニュー画面（CPU戦 / オンライン対戦）
│   ├── game/page.tsx            # CPU戦ゲーム画面
│   ├── online/
│   │   ├── page.tsx             # ルーム作成・参加UI
│   │   └── [code]/page.tsx      # オンラインゲーム画面
│   └── api/
│       └── rooms/
│           ├── route.ts         # POST: ルーム作成
│           └── [code]/
│               ├── join/route.ts
│               ├── hand/route.ts
│               ├── mulligan/route.ts
│               ├── select/route.ts
│               ├── resign/route.ts
│               ├── rematch/route.ts
│               └── leave/route.ts
├── components/
│   ├── Grid.tsx                 # 3×3グリッド全体
│   ├── GridCell.tsx             # 1マス（カードフリップアニメ担当）
│   ├── PlayingCard.tsx          # トランプカードUI
│   ├── Hand.tsx                 # 手札（ファンレイアウト）
│   ├── ScoreBoard.tsx           # スコア + 優勢バー
│   ├── RevealOverlay.tsx        # カードオープン演出（全画面オーバーレイ）
│   └── GameOverModal.tsx        # 勝敗結果画面
├── lib/
│   ├── types.ts                 # 型定義（Card, GridCell, GamePhase, ...）
│   ├── deck.ts                  # createDeck, shuffle, createShuffledHands
│   ├── engine.ts                # compareCards, calcScore, applyRound（純粋関数）
│   ├── ai.ts                    # CPU カード選択ロジック
│   ├── roomCode.ts              # 4文字ルームコード生成（紛らわしい文字除く）
│   ├── supabase.ts              # Supabase クライアント（クライアント用）
│   ├── supabase-server.ts       # Supabase クライアント（サーバー用・SERVICE_ROLE_KEY）
│   └── redis.ts                 # ioredis クライアント（getRedis singleton）
├── store/
│   ├── gameStore.ts             # CPU戦 Zustand ストア
│   └── onlineStore.ts           # オンライン対戦 Zustand ストア
└── hooks/
    ├── useGameLoop.ts           # CPU戦フェーズ自動進行
    └── useOnlineSync.ts         # Supabase Realtime → Zustand 同期
```

---

## CPU AI 設計

`lib/ai.ts` に実装。純粋関数 `cpuSelectCard(hand, grid, round)` を公開。

**戦略:**
1. **最小コスト勝利**: そのマスでギリギリ勝てるカードを選ぶ（強いカードを温存）
2. **ライン考慮**: ラインボーナスに繋がるマスには強いカードを投入
3. **同スートブラフ対応**: 異スートで勝てるカードを優先し、スートマッチリスクを管理
4. **センター軽視**: センター（0点）には弱いカードを出す

---

## RevealOverlay — 2段階アニメーション

`components/RevealOverlay.tsx` がオーバーレイ全体を担当。

| フェーズ | 表示内容 |
|----------|----------|
| PLACED（isPlaced=true） | 裏向きカード×2 + "DUEL!" バウンステキスト |
| REVEALING（isPlaced=false） | カードフリップ（rotateY: 90→0） + WIN!/LOSE/DRAW + スートマッチ通知 |

**スートマッチ表示:**
- WIN時: `✦ SUIT MATCH +2pt`（黄色）
- LOSE時: `✦ SUIT MATCH -2pt`（グレー）
- センターマス（round=5 / index=4）: ポイント表示なし

---

## 環境変数

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...（クライアント Realtime 用）
SUPABASE_SERVICE_ROLE_KEY=eyJ...（サーバーサイド DB 書き込み用・NEXT_PUBLIC_不可）

# Vercel KV (ioredis)
KV_REST_API_URL=https://xxxx.kv.vercel-storage.com
KV_REST_API_TOKEN=xxxx
# または
REDIS_URL=redis://...
```

---

## 開発の流れ

### Phase 1: ゲームエンジン & CPU戦

1. `lib/types.ts` — Card, GridCell, GamePhase 定義
2. `lib/deck.ts` — デッキ生成・シャッフル・配布
3. `lib/engine.ts` — compareCards, calcScore（純粋関数）
4. `lib/ai.ts` — CPU選択ロジック
5. `store/gameStore.ts` — Zustand ストア（selectCard, advancePhase）
6. `hooks/useGameLoop.ts` — フェーズ自動進行
7. 各コンポーネント実装

### Phase 2: UI 刷新

1. RevealOverlay — 2段階アニメーション（PLACED + REVEALING）
2. Hand — ファンレイアウト（重ね表示）
3. ScoreBoard — 優勢バー追加
4. マリガン — 選択式（任意枚数）に変更
5. 捨て札 — モーダル化
6. ドロー on Loss — NEXT_ROUND での手札補充

### Phase 3: オンライン対戦

1. Supabase セットアップ（rooms テーブル + Realtime 有効化）
2. Vercel KV セットアップ
3. API Routes 8本実装
4. `store/onlineStore.ts` + `hooks/useOnlineSync.ts`
5. `app/online/page.tsx` — ルーム作成・参加UI
6. `app/online/[code]/page.tsx` — ゲーム画面

### Phase 4: ポリッシュ & デプロイ

1. スートマッチ表示（センターマス非ポイント対応）
2. 再戦機能実装
3. 離脱通知実装
4. Vercel 環境変数設定
5. デプロイ・動作確認

---

## 検証方法

- **CPU戦**: 9ラウンド完走、スコア計算、マリガン、ドロー、GAME_OVER 正常表示
- **オンライン**: ブラウザ2タブ（またはPC+スマホ）で同一ルームに参加
  - 手札が相手に見えないことをDevToolsで確認
  - マリガン: 両者完了後にSELECTINGへ遷移
  - カード選択: 片方選択後WAITING → もう片方選択 → PLACED → 同時オープン
  - 9ラウンド完走 → GAME_OVER が両者に表示
  - 再戦: 両者承認後マリガン画面に戻る

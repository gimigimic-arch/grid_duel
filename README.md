# Grid Duel

トランプ52枚を使った1v1バトルカードゲーム。3×3のグリッドを制圧しあうオリジナルルールで、CPU戦とオンライン対人戦に対応。

**→ [プレイする](https://grid-duel-zsuz.vercel.app)**

---

## ゲーム概要

各プレイヤーに9枚のカードを配り、3×3グリッドの9マスを1ラウンドずつ争う。両者が同時にカードを1枚伏せて出し、同時公開して判定する。

**コアルール: スートによって強さが逆転する**

| 状況 | 勝者 |
|------|------|
| 同じスート | **低い数字** が勝つ |
| 異なるスート | **高い数字** が勝つ |
| 同じランク | 引き分け |

この1つのルールが「相手のスートを読む」という駆け引きを生む。A（エース）は通常最強だが、同スートのカードには2で負ける。

**スコア**
- 通常制圧: 1点、スートマッチ制圧: 2点
- 縦横斜えいずれかのライン3連: +1点
- 中央マスのみ0点（ラインボーナスには貢献）

---

## 技術スタック

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** + **Framer Motion**
- **Zustand**（ゲーム状態管理）
- **Supabase** (Realtime / PostgreSQL)
- **Vercel KV** (Redis / ioredis)
- **Vercel** (ホスティング)

---

## 実装のポイント

### 1. ゲームエンジンをUIから完全分離した

`lib/engine.ts` はReact依存ゼロの純粋関数のみで構成されている。

```ts
// 2枚のカードを比較して勝者を返す
export function compareCards(a: Card, b: Card): 'a' | 'b' | 'tie' {
  if (a.rank === b.rank) return 'tie';
  if (isSuitMatch(a, b)) {
    return a.rank < b.rank ? 'a' : 'b'; // 同スート: 低い方勝ち
  } else {
    return a.rank > b.rank ? 'a' : 'b'; // 異スート: 高い方勝ち
  }
}
```

同じ `compareCards` 関数がCPU戦のクライアントとオンライン対戦のサーバーAPIの両方で使われる。ロジックが1箇所に集約されているため、ルール変更の影響範囲が明確。

### 2. オンライン対戦で手札をネットワークに送らない設計

手札はブラウザのZustandにのみ保持し、ネットワークには一切送信しない。カード選択時はカードIDだけをAPIに送る。

```
Player A: POST { cardId: "♠14" }
                    ↓
              Redis に一時保存
              両者揃ったら → compareCards() → 結果だけ Supabase へ
                    ↓ Realtime
Player B: 結果を受信（相手の手札は受け取らない）
```

DevToolsのネットワークタブを見ても相手の手札は見えない。

### 3. Supabase Realtime でフェーズを同期する

サーバーが `shared_state`（JSON）を Supabase に書き込み、両クライアントは `postgres_changes` イベントで即座に受け取る。クライアントはポーリングをしない。

アニメーションのタイミングはクライアント側で `setTimeout` で管理する。Realtimeはフェーズ遷移のトリガーとしてのみ使い、タイミング制御はローカルに閉じることで、ネットワーク遅延がアニメーションに影響しない。

### 4. CPU AIが相手の手札を確率で推定する

既出カードと自分の手札から「相手が持ちうるカード」を推定し、各カードの期待勝率を計算する。

```ts
// 既知のカードを除いた相手の可能性カードを推定
const knownIds = new Set([
  ...cpuHand.map(c => c.id),
  ...grid.flatMap(c => [c.playerCard?.id, c.cpuCard?.id]).filter(Boolean),
]);
const playerPossibleCards = createDeck().filter(c => !knownIds.has(c.id));

// 期待勝率 × マス重要度 - カードコスト（弱いカードで勝てるなら強いカードを温存）
const score = winRate * (cellImportance + 1) - cardCost * 0.3;
```

ライン完成への貢献度も考慮し、センター（0点マス）にあえて弱いカードを出すといった行動もとる。10%の確率でランダム選択を混ぜて人間らしさを演出。

### 5. 2段階のカードオープン演出

```
PLACED フェーズ            REVEALING フェーズ
┌──────────────┐           ┌──────────────┐
│  🂠    🂠   │   1.2秒   │  K♠   5♥   │
│   DUEL!      │ ────────→ │  WIN! +2pt   │
└──────────────┘           └──────────────┘
```

フルスクリーンオーバーレイで伏せカードを表示し、「DUEL!」テキストのバウンス後にカードがrotateYでフリップする。`isPlaced` prop 1つで2つの表示状態を切り替える単一コンポーネント設計。

---

## 機能一覧

- **CPU戦**: AI対戦、マリガン、ドロー on Loss
- **オンライン対戦**: ルームコード制、Realtimeリアルタイム同期
- **再戦機能**: ゲーム終了後に両者が合意すればその場で再戦
- **マリガン**: 任意枚数を選んで引き直し（1回限り）
- **捨て札公開**: マリガンで捨てたカードは相手にも見える
- **投了**: ゲーム中いつでも投了可能
- **スマホ対応**: タップ操作・レスポンシブレイアウト

---

## ディレクトリ構成

```
grid-duel/
├── app/
│   ├── page.tsx                 # メニュー画面
│   ├── game/page.tsx            # CPU戦
│   ├── online/page.tsx          # ルーム作成・参加
│   ├── online/[code]/page.tsx   # オンライン対戦
│   └── api/rooms/               # API Routes (8エンドポイント)
├── components/                  # UI コンポーネント
├── lib/
│   ├── engine.ts                # ゲームロジック（純粋関数）
│   ├── ai.ts                    # CPU 選択ロジック
│   └── deck.ts                  # デッキ生成・シャッフル
├── store/
│   ├── gameStore.ts             # CPU戦 Zustand
│   └── onlineStore.ts           # オンライン Zustand
└── hooks/
    ├── useGameLoop.ts           # フェーズ自動進行
    └── useOnlineSync.ts         # Supabase Realtime 同期
```

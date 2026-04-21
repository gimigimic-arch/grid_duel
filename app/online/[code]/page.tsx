'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOnlineStore, OnlineGridCell } from '@/store/onlineStore';
import { useOnlineSync } from '@/hooks/useOnlineSync';
import { Card, GridCell } from '@/lib/types';
import Grid from '@/components/Grid';
import Hand from '@/components/Hand';
import ScoreBoard from '@/components/ScoreBoard';
import RevealOverlay from '@/components/RevealOverlay';
import PlayingCard from '@/components/PlayingCard';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// OnlineGridCell → GridCell（自分視点）
function toGridCell(cell: OnlineGridCell, myRole: 'host' | 'guest'): GridCell {
  const opponentRole = myRole === 'host' ? 'guest' : 'host';
  const owner =
    cell.owner === myRole ? 'player' :
    cell.owner === opponentRole ? 'cpu' :
    cell.owner === 'tie' ? 'tie' : null;
  return {
    owner,
    playerCard: myRole === 'host' ? cell.hostCard : cell.guestCard,
    cpuCard: myRole === 'host' ? cell.guestCard : cell.hostCard,
    suitMatch: cell.suitMatch,
  };
}

export default function OnlineGamePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();

  const {
    roomCode, playerId, role, myHand, selectedCard, shared, localPhase,
    mulliganSelected, myMulliganDone,
    setSelectedCard, setLocalPhase, toggleMulliganCard, setMyMulliganDone,
  } = useOnlineStore();

  useOnlineSync(roomCode);

  // ロビーに戻った / リロード時の再接続
  useEffect(() => {
    if (roomCode) return;
    try {
      const stored = localStorage.getItem('gridDuelSession');
      if (!stored) { router.replace('/online'); return; }
      const session = JSON.parse(stored) as { roomCode: string; playerId: string; role: 'host' | 'guest' };
      if (session.roomCode !== code) { router.replace('/online'); return; }
      fetch(`/api/rooms/${session.roomCode}/hand?playerId=${session.playerId}`)
        .then(r => r.json())
        .then(data => {
          if (data.hand) {
            useOnlineStore.setState({
              roomCode: session.roomCode,
              playerId: session.playerId,
              role: session.role,
              myHand: data.hand,
              localPhase: 'SELECTING',
            });
          } else {
            router.replace('/online');
          }
        })
        .catch(() => router.replace('/online'));
    } catch {
      router.replace('/online');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSubmittingRef = useRef(false);
  const [mulliganLoading, setMulliganLoading] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [resignConfirm, setResignConfirm] = useState(false);
  const [rematchLoading, setRematchLoading] = useState(false);

  async function handleResign() {
    if (!playerId || !roomCode) { router.replace('/online'); return; }
    try {
      await fetch(`/api/rooms/${roomCode}/resign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      });
    } catch { /* ignore */ }
    useOnlineStore.getState().reset();
    router.replace('/online');
  }

  async function handleRematch() {
    if (!playerId || !roomCode || rematchLoading) return;
    setRematchLoading(true);
    try {
      await fetch(`/api/rooms/${roomCode}/rematch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      });
    } catch { /* ignore */ }
    setRematchLoading(false);
  }

  // スコア表示はREVEALING完了後に更新
  const [displayScore, setDisplayScore] = useState({ my: 0, opponent: 0 });

  // PLACED アニメーション管理（round + phase の組み合わせで発火）
  const prevSharedRef = useRef<{ phase: string; round: number } | null>(null);
  useEffect(() => {
    if (!shared) return;

    const curr = { phase: shared.phase, round: shared.round };
    const prev = prevSharedRef.current;
    prevSharedRef.current = curr;

    if (localPhase === 'PLACED' || localPhase === 'REVEALING') return; // アニメ中は無視

    if (shared.phase === 'SELECTING' && localPhase !== 'SELECTING') {
      setLocalPhase('SELECTING');
      setSelectedCard(null);
    }
  }, [shared?.phase, shared?.round, localPhase, setLocalPhase, setSelectedCard]);

  // PLACED → REVEALING → 手札更新 → SELECTING
  useEffect(() => {
    if (localPhase !== 'PLACED') return;
    const t1 = setTimeout(() => {
      setLocalPhase('REVEALING');
      const t2 = setTimeout(async () => {
        // 手札を更新（ドロー反映）
        if (playerId && roomCode) {
          try {
            const res = await fetch(`/api/rooms/${roomCode}/hand?playerId=${playerId}`);
            const data = await res.json();
            if (data.hand) {
              useOnlineStore.setState({ myHand: data.hand });
            }
          } catch { /* ignore */ }
        }
        // REVEALING完了のタイミングでスコアを表示に反映
        if (shared) {
          const myScoreNow = role === 'host' ? (shared.hostScore ?? 0) : (shared.guestScore ?? 0);
          const opScoreNow = role === 'host' ? (shared.guestScore ?? 0) : (shared.hostScore ?? 0);
          setDisplayScore({ my: myScoreNow, opponent: opScoreNow });
        }
        setLocalPhase(shared?.phase === 'GAME_OVER' ? 'GAME_OVER' : 'SELECTING');
        setSelectedCard(null);
      }, 1400);
      return () => clearTimeout(t2);
    }, 1200);
    return () => clearTimeout(t1);
  }, [localPhase, playerId, roomCode, setLocalPhase, setSelectedCard, shared, role]);

  // 再戦後の手札フェッチ（MULLIGAN 開始時に myHand が空なら取得）、スコアもリセット
  useEffect(() => {
    if (localPhase !== 'MULLIGAN' || myHand.length > 0 || !playerId || !roomCode) return;
    setDisplayScore({ my: 0, opponent: 0 });
    fetch(`/api/rooms/${roomCode}/hand?playerId=${playerId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.hand) useOnlineStore.setState({ myHand: data.hand });
      })
      .catch(() => {});
  }, [localPhase, myHand.length, playerId, roomCode]);

  // マリガン処理（重複送信防止）
  async function handleMulligan() {
    if (!playerId || !roomCode || mulliganLoading || myMulliganDone) return;
    setMulliganLoading(true);
    const ids = [...mulliganSelected];
    try {
      const res = await fetch(`/api/rooms/${roomCode}/mulligan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, selectedCardIds: ids }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.hand) {
        useOnlineStore.setState({ myHand: data.hand, mulliganSelected: new Set() });
      }
      setMyMulliganDone(true);
      setLocalPhase('WAITING_FOR_MULLIGAN');
    } catch { /* ignore */ } finally {
      setMulliganLoading(false);
    }
  }

  // カード選択・送信（二重送信防止）
  async function handleSelectCard(card: Card) {
    if (!playerId || !roomCode || localPhase !== 'SELECTING' || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setSelectedCard(card);
    setLocalPhase('WAITING');
    try {
      await fetch(`/api/rooms/${roomCode}/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, cardId: card.id }),
      });
    } catch {
      setLocalPhase('SELECTING');
      setSelectedCard(null);
    } finally {
      isSubmittingRef.current = false;
    }
  }

  // ---- 接続中 ----
  if (!roomCode || !role || !shared) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400 font-mono animate-pulse">接続中...</p>
      </div>
    );
  }

  // ---- ホスト: ゲスト参加待ち ----
  if (localPhase === 'WAITING_FOR_GUEST') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-8 px-4">
        <div className="text-center space-y-2">
          <p className="text-slate-400 text-sm font-mono">相手にこのコードを共有してください</p>
          <div className="text-6xl font-black tracking-[0.3em] text-emerald-400 font-mono">{code}</div>
        </div>
        <p className="text-slate-500 text-sm font-mono animate-pulse">相手の参加を待っています...</p>
        <Link href="/online" className="text-slate-600 text-xs hover:text-slate-400 transition-colors">
          ← ロビーへ
        </Link>
      </div>
    );
  }

  // ---- マリガン画面 ----
  if (localPhase === 'MULLIGAN' && !myMulliganDone) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center px-4 py-6 gap-5">
        <div className="flex items-center justify-between w-full max-w-sm">
          <Link href="/online" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
            ← ロビー
          </Link>
          <div className="text-center">
            <h1 className="text-base font-bold text-slate-200 font-mono tracking-widest">GRID DUEL</h1>
            <p className="text-slate-600 text-xs font-mono">{code}</p>
          </div>
          <div className="w-16" />
        </div>

        <div className="text-center space-y-1">
          <p className="text-slate-200 font-bold text-base">あなたの初期手札</p>
          <p className="text-slate-500 text-xs">入れ替えたいカードをタップして選択（1回限り）</p>
        </div>

        <div className="flex flex-col items-center gap-2">
          {[myHand.slice(0, 5), myHand.slice(5)].map((row, ri) => (
            <div key={ri} className="flex gap-2">
              {row.map((card) => {
                const isMarked = mulliganSelected.has(card.id);
                return (
                  <div
                    key={card.id}
                    className="relative cursor-pointer"
                    style={{
                      transform: isMarked ? 'translateY(-12px)' : 'translateY(0)',
                      transition: 'transform 0.15s ease',
                    }}
                    onClick={() => toggleMulliganCard(card.id)}
                  >
                    <PlayingCard card={card} selected={isMarked} />
                    {isMarked && (
                      <div className="absolute inset-0 rounded-xl border-2 border-red-400 pointer-events-none" />
                    )}
                    {isMarked && (
                      <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center pointer-events-none">
                        <span className="text-white text-[10px] font-black leading-none">✕</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <p className="text-xs font-mono text-slate-400">
          {mulliganSelected.size > 0 ? `${mulliganSelected.size}枚選択中` : '（選択なしで開始 = マリガンなし）'}
        </p>

        <div className="flex gap-3 w-full max-w-sm">
          <button
            onClick={handleMulligan}
            disabled={mulliganSelected.size === 0 || mulliganLoading}
            className="flex-1 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white font-bold text-sm transition-colors"
          >
            マリガン ({mulliganSelected.size}枚)
            <span className="block text-slate-400 text-xs font-normal">選択カードを引き直す</span>
          </button>
          <button
            onClick={handleMulligan}
            disabled={mulliganLoading}
            className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-sm transition-colors"
          >
            {mulliganLoading ? '送信中...' : 'このまま開始'}
          </button>
        </div>
      </div>
    );
  }

  // ---- マリガン完了・相手待ち ----
  if (localPhase === 'WAITING_FOR_MULLIGAN') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-4">
        <p className="text-slate-400 text-sm font-mono animate-pulse">相手のマリガン待ち...</p>
        <p className="text-slate-600 text-xs font-mono">ルームコード: {code}</p>
      </div>
    );
  }

  // ---- ゲーム画面 ----
  const grid = (shared.grid ?? []).map((cell) => toGridCell(cell, role));
  const myScore = role === 'host' ? (shared.hostScore ?? 0) : (shared.guestScore ?? 0);
  const opponentScore = role === 'host' ? (shared.guestScore ?? 0) : (shared.hostScore ?? 0);
  const opponentHandCount = role === 'host' ? (shared.guestHandCount ?? myHand.length) : (shared.hostHandCount ?? myHand.length);

  const isPlaced = localPhase === 'PLACED';
  const isRevealing = localPhase === 'REVEALING';
  const isSelecting = localPhase === 'SELECTING';
  const isWaiting = localPhase === 'WAITING';
  const isGameOver = localPhase === 'GAME_OVER' || (shared.phase === 'GAME_OVER' && localPhase !== 'PLACED' && localPhase !== 'REVEALING');

  // 現在のラウンド（次に争うセルのインデックス）
  const nextEmptyIndex = grid.findIndex((c) => c.owner === null);
  const currentRound = nextEmptyIndex === -1 ? 9 : nextEmptyIndex + 1;

  // 自分が伏せ済み（WAITING）か、相手が伏せ済みか
  const myWaiting = role === 'host' ? shared.host_waiting : shared.guest_waiting;
  const opponentWaitingFlag = role === 'host' ? shared.guest_waiting : shared.host_waiting;
  const myCardPendingIndex = myWaiting && nextEmptyIndex >= 0 ? nextEmptyIndex : undefined;
  const opponentCardPendingIndex = opponentWaitingFlag && nextEmptyIndex >= 0 ? nextEmptyIndex : undefined;

  // RevealOverlay 用: 最後に解決されたセル
  const resolvedIndex = Math.max((shared.round ?? 1) - 1, 0);
  const lastCell = shared.grid?.[resolvedIndex];
  const myCard = lastCell
    ? (role === 'host' ? lastCell.hostCard : lastCell.guestCard)
    : null;
  const opCard = lastCell
    ? (role === 'host' ? lastCell.guestCard : lastCell.hostCard)
    : null;
  const resultForMe: 'player' | 'cpu' | 'tie' | null =
    !shared.lastResult ? null :
    shared.lastResult === role ? 'player' :
    shared.lastResult === 'tie' ? 'tie' : 'cpu';

  const winnerLabel =
    !shared.winner ? null :
    shared.winner === 'draw' ? '引き分け' :
    shared.winner === role ? 'あなたの勝ち！' : '相手の勝ち';

  const myDiscard = role === 'host' ? (shared.hostDiscard ?? []) : (shared.guestDiscard ?? []);
  const opDiscard = role === 'host' ? (shared.guestDiscard ?? []) : (shared.hostDiscard ?? []);
  const hasDiscard = myDiscard.length > 0 || opDiscard.length > 0;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center px-3 py-4 gap-3">

      {/* ヘッダー */}
      <div className="flex items-center justify-between w-full max-w-sm">
        <button
          onClick={() => setResignConfirm(true)}
          className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
        >
          ← ロビー
        </button>
        <div className="text-center">
          <h1 className="text-base font-bold text-slate-200 font-mono tracking-widest">GRID DUEL</h1>
          <p className="text-slate-600 text-[10px] font-mono">{code}</p>
        </div>
        <div className="w-16" />
      </div>

      {/* スコア */}
      <ScoreBoard playerScore={displayScore.my} cpuScore={displayScore.opponent} round={Math.min(currentRound, 9)} playerLabel="YOU" opponentLabel="PLAYER" />

      {/* 相手エリア */}
      <div className="w-full max-w-sm flex items-center justify-between px-1">
        <span className="text-xs text-slate-500 font-mono">相手の手札: {opponentHandCount}枚</span>
        {shared.host_waiting && shared.guest_waiting && (
          <span className="text-xs text-yellow-400 font-mono">両者選択済み</span>
        )}
        {(role === 'host' ? shared.guest_waiting : shared.host_waiting) && !(role === 'host' ? shared.host_waiting : shared.guest_waiting) && (
          <span className="text-xs text-yellow-400 font-mono animate-pulse">相手は選択済み</span>
        )}
      </div>

      {/* グリッド */}
      <div className="w-full relative">
        <Grid
          grid={grid}
          currentRound={Math.min(currentRound, 9)}
          isRevealing={isRevealing}
          myCardPendingIndex={myCardPendingIndex}
          opponentCardPendingIndex={opponentCardPendingIndex}
          opponentLabel="PLAYER"
        />
      </div>

      {/* ドロー通知 */}
      <div className="h-6 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {shared.pendingDraw && (localPhase === 'REVEALING' || localPhase === 'PLACED' || localPhase === 'SELECTING') && (
            <motion.span
              key="draw"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs font-mono text-slate-400"
            >
              {shared.pendingDraw === role ? 'あなたが1枚ドロー' : '相手が1枚ドロー'}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* プレイヤーエリア */}
      <div className="w-full max-w-sm space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-slate-500 font-mono">
            {isSelecting ? 'カードをタップして出す' :
             isWaiting ? '相手を待っています...' :
             '　'}
          </span>
          {hasDiscard && (
            <button
              onClick={() => setDiscardOpen(true)}
              className="text-[10px] text-slate-300 font-mono bg-slate-700 hover:bg-slate-600 px-2 py-0.5 rounded-full transition-colors"
            >
              捨て札
            </button>
          )}
        </div>

        <Hand
          hand={myHand}
          selectedCard={selectedCard}
          onSelect={handleSelectCard}
          disabled={!isSelecting}
        />
      </div>

      {/* カードオープン演出 */}
      <RevealOverlay
        show={isPlaced || isRevealing}
        isPlaced={isPlaced}
        playerCard={myCard ?? null}
        cpuCard={opCard ?? null}
        result={resultForMe}
        suitMatch={shared.lastSuitMatch ?? false}
        isCenterCell={resolvedIndex === 4}
        playerLabel="YOU"
        opponentLabel="PLAYER"
      />

      {/* 捨て札モーダル */}
      <AnimatePresence>
        {discardOpen && (
          <motion.div
            key="discard-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDiscardOpen(false)}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl p-5 w-full max-w-sm space-y-4"
            >
              <h2 className="text-slate-200 font-bold text-sm font-mono">マリガン捨て札</h2>

              {myDiscard.length > 0 && (
                <div>
                  <p className="text-[11px] text-slate-500 font-mono mb-2">あなたの捨て札</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {myDiscard.map((c) => (
                      <PlayingCard key={c.id} card={c} small />
                    ))}
                  </div>
                </div>
              )}

              {opDiscard.length > 0 && (
                <div>
                  <p className="text-[11px] text-slate-500 font-mono mb-2">相手の捨て札</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {opDiscard.map((c) => (
                      <PlayingCard key={c.id} card={c} small />
                    ))}
                  </div>
                </div>
              )}

              {myDiscard.length === 0 && opDiscard.length === 0 && (
                <p className="text-slate-600 text-sm">捨て札なし</p>
              )}

              <button
                onClick={() => setDiscardOpen(false)}
                className="w-full py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold transition-colors"
              >
                閉じる
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 投了確認ダイアログ */}
      <AnimatePresence>
        {resignConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 rounded-2xl p-6 w-full max-w-sm space-y-4 text-center"
            >
              <p className="text-white font-bold text-base">ロビーに戻りますか？</p>
              <p className="text-slate-400 text-sm">ゲームを中断すると相手の勝利になります。</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setResignConfirm(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleResign}
                  className="flex-1 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white text-sm font-bold transition-colors"
                >
                  戻る（負け扱い）
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ゲームオーバー */}
      <AnimatePresence>
        {isGameOver && winnerLabel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center gap-6 px-4"
          >
            <div className="text-center space-y-2">
              <p className="text-4xl font-black text-white">{winnerLabel}</p>
              {shared.resigned && (
                <p className="text-slate-500 text-xs font-mono">
                  {shared.resigned === role ? 'あなたが投了しました' : '相手が投了しました'}
                </p>
              )}
              <p className="text-slate-400 font-mono text-sm">
                あなた {myScore}点 vs 相手 {opponentScore}点
              </p>
            </div>
            <div className="flex flex-col items-center gap-3 w-full max-w-xs">
              {(() => {
                const myRematch = role === 'host' ? shared.rematch_host : shared.rematch_guest;
                const opRematch = role === 'host' ? shared.rematch_guest : shared.rematch_host;
                const opLeft = role === 'host' ? shared.left_guest : shared.left_host;
                if (opLeft) {
                  return <p className="text-slate-500 text-sm font-mono">相手がロビーに戻りました</p>;
                }
                if (myRematch) {
                  return <p className="text-slate-400 text-sm font-mono">相手の承認待ち...</p>;
                }
                return (
                  <button
                    onClick={handleRematch}
                    disabled={rematchLoading}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold transition-colors"
                  >
                    {opRematch ? '🔄 相手が再戦を希望 — 承認する' : '再戦する'}
                  </button>
                );
              })()}
              <button
                onClick={async () => {
                  if (playerId && roomCode) {
                    await fetch(`/api/rooms/${roomCode}/leave`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ playerId }),
                    }).catch(() => {});
                  }
                  useOnlineStore.getState().reset();
                  router.replace('/online');
                }}
                className="w-full py-3 rounded-xl text-center bg-slate-700 hover:bg-slate-600 text-white font-bold transition-colors"
              >
                ロビーに戻る
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

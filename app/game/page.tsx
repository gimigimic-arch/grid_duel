'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useGameLoop } from '@/hooks/useGameLoop';
import Grid from '@/components/Grid';
import Hand from '@/components/Hand';
import ScoreBoard from '@/components/ScoreBoard';
import GameOverModal from '@/components/GameOverModal';
import PlayingCard from '@/components/PlayingCard';
import RevealOverlay from '@/components/RevealOverlay';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function GamePage() {
  const {
    phase,
    round,
    playerHand,
    cpuHand,
    selectedCard,
    cpuSelectedCard,
    grid,
    playerScore,
    cpuScore,
    winner,
    lastResult,
    lastSuitMatch,
    playerMulliganed,
    pendingDraw,
    mulliganDiscardPlayer,
    mulliganDiscardCpu,
    selectCard,
    mulligan,
    passMulligan,
    resetGame,
  } = useGameStore();

  useGameLoop();

  // マリガン画面: 入れ替えるカードの選択状態（ローカル）
  const [selectedForMulligan, setSelectedForMulligan] = useState<Set<string>>(new Set());
  // 捨て札モーダル
  const [discardOpen, setDiscardOpen] = useState(false);

  // フェーズがMULLIGANに戻ったら選択をリセット
  useEffect(() => {
    if (phase === 'MULLIGAN') {
      setSelectedForMulligan(new Set());
      setDiscardOpen(false);
    }
  }, [phase]);

  const toggleMulliganCard = (id: string) => {
    setSelectedForMulligan((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const isSelecting = phase === 'SELECTING';
  const isPlaced   = phase === 'PLACED';
  const isRevealing = phase === 'REVEALING';
  const isGameOver  = phase === 'GAME_OVER';
  const isMulligan  = phase === 'MULLIGAN';

  // ---- マリガン画面 ----
  if (isMulligan) {
    const selectedCount = selectedForMulligan.size;
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center px-4 py-6 gap-5">
        <div className="flex items-center justify-between w-full max-w-sm">
          <Link href="/" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
            ← メニュー
          </Link>
          <h1 className="text-lg font-bold text-slate-200 font-mono tracking-widest">GRID DUEL</h1>
          <div className="w-16" />
        </div>

        <div className="text-center space-y-1">
          <p className="text-slate-200 font-bold text-base">あなたの初期手札</p>
          <p className="text-slate-500 text-xs">
            入れ替えたいカードをタップして選択（1回限り）
          </p>
        </div>

        {/* 手札（マリガン用: 5枚+残り の2行固定、幅依存なし） */}
        <div className="flex flex-col items-center gap-2">
          {[playerHand.slice(0, 5), playerHand.slice(5)].map((row, ri) => (
            <div key={ri} className="flex gap-2">
              {row.map((card) => {
                const isMarked = selectedForMulligan.has(card.id);
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
          {selectedCount > 0 ? `${selectedCount}枚選択中` : '（選択なしで開始 = マリガンなし）'}
        </p>

        <div className="flex gap-3 w-full max-w-sm">
          <button
            onClick={() => mulligan([...selectedForMulligan])}
            disabled={selectedCount === 0}
            className="flex-1 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors"
          >
            マリガン ({selectedCount}枚)
            <span className="block text-slate-400 text-xs font-normal">選択カードを引き直す</span>
          </button>
          <button
            onClick={passMulligan}
            className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-colors"
          >
            このまま開始
          </button>
        </div>
      </div>
    );
  }

  const hasDiscard = mulliganDiscardPlayer.length > 0 || mulliganDiscardCpu.length > 0;

  // ---- ゲーム画面 ----
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center px-3 py-4 gap-3">

      {/* ヘッダー */}
      <div className="flex items-center justify-between w-full max-w-sm">
        <Link href="/" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
          ← メニュー
        </Link>
        <h1 className="text-base font-bold text-slate-200 font-mono tracking-widest">GRID DUEL</h1>
        <div className="w-16 text-right">
          {playerMulliganed && (
            <span className="text-[10px] text-slate-600 font-mono">マリガン済</span>
          )}
        </div>
      </div>

      {/* スコア + 優勢バー */}
      <ScoreBoard playerScore={playerScore} cpuScore={cpuScore} round={round} />

      {/* CPU エリア */}
      <div className="w-full max-w-sm flex items-center justify-between px-1">
        <span className="text-xs text-slate-500 font-mono">CPU 手札: {cpuHand.length}枚</span>
        {(isPlaced || isRevealing) && (
          <span className="text-xs text-yellow-400 font-mono animate-pulse">カード選択済み</span>
        )}
      </div>

      {/* 3×3 グリッド */}
      <div className="w-full relative">
        <Grid grid={grid} currentRound={round} isRevealing={isRevealing} />
      </div>

      {/* ラウンド結果 + ドロー通知 */}
      <div className="h-6 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {phase === 'NEXT_ROUND' && (pendingDraw.player || pendingDraw.cpu) ? (
            <motion.span
              key="draw"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs font-mono text-slate-400"
            >
              {pendingDraw.player ? 'あなたが1枚ドロー' : 'CPUが1枚ドロー'}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </div>

      {/* プレイヤーエリア */}
      <div className="w-full max-w-sm space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-slate-500 font-mono">
            {isSelecting ? 'カードをタップして出す' : phase === 'PLACED' ? 'カード伏せ中...' : '　'}
          </span>
          {hasDiscard && (
            <button
              onClick={() => setDiscardOpen(true)}
              className="text-[10px] text-slate-500 hover:text-slate-300 font-mono underline transition-colors"
            >
              捨て札
            </button>
          )}
        </div>

        {/* 手札（ファンレイアウト） */}
        <Hand
          hand={playerHand}
          selectedCard={selectedCard}
          onSelect={selectCard}
          disabled={!isSelecting}
        />
      </div>

      {/* 状態インジケーター */}
      {!isSelecting && phase !== 'GAME_OVER' && phase !== 'NEXT_ROUND' && phase !== 'PLACED' && phase !== 'REVEALING' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-slate-600 text-xs font-mono animate-pulse"
        >
          判定中...
        </motion.div>
      )}

      {/* カードオープン演出オーバーレイ */}
      <RevealOverlay
        show={isPlaced || isRevealing}
        isPlaced={isPlaced}
        playerCard={selectedCard}
        cpuCard={cpuSelectedCard}
        result={lastResult}
        suitMatch={lastSuitMatch}
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

              {mulliganDiscardPlayer.length > 0 && (
                <div>
                  <p className="text-[11px] text-slate-500 font-mono mb-2">あなたの捨て札</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {mulliganDiscardPlayer.map((c) => (
                      <PlayingCard key={c.id} card={c} small />
                    ))}
                  </div>
                </div>
              )}

              {mulliganDiscardCpu.length > 0 && (
                <div>
                  <p className="text-[11px] text-slate-500 font-mono mb-2">CPUの捨て札</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {mulliganDiscardCpu.map((c) => (
                      <PlayingCard key={c.id} card={c} small />
                    ))}
                  </div>
                </div>
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

      {/* ゲームオーバーモーダル */}
      {isGameOver && winner && (
        <GameOverModal
          winner={winner}
          playerScore={playerScore}
          cpuScore={cpuScore}
          grid={grid}
          onRestart={resetGame}
        />
      )}
    </div>
  );
}

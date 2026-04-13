'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useGameLoop } from '@/hooks/useGameLoop';
import Grid from '@/components/Grid';
import Hand from '@/components/Hand';
import ScoreBoard from '@/components/ScoreBoard';
import GameOverModal from '@/components/GameOverModal';
import PlayingCard from '@/components/PlayingCard';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

export default function GamePage() {
  const {
    phase,
    round,
    playerHand,
    selectedCard,
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

  // ゲームリセット時に選択をクリア
  useEffect(() => {
    if (phase === 'MULLIGAN') setSelectedForMulligan(new Set());
  }, [phase]);

  const toggleMulliganCard = (id: string) => {
    setSelectedForMulligan((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const isSelecting = phase === 'SELECTING';
  const isRevealing = phase === 'REVEALING';
  const isGameOver = phase === 'GAME_OVER';
  const isMulligan = phase === 'MULLIGAN';

  const suitMatchLabel = lastSuitMatch ? ' ✦スート一致！' : '';
  const resultMessage =
    lastResult === 'player' ? `あなたの制圧！${suitMatchLabel}` :
    lastResult === 'cpu'    ? `CPUの制圧${suitMatchLabel}` :
    lastResult === 'tie'    ? '引き分け' : null;

  const resultColor =
    lastResult === 'player' ? (lastSuitMatch ? 'text-yellow-300' : 'text-blue-400') :
    lastResult === 'cpu'    ? (lastSuitMatch ? 'text-orange-400' : 'text-red-400') :
    'text-slate-400';

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

        {/* 手札（選択可能） */}
        <div className="flex flex-wrap justify-center gap-2">
          {playerHand.map((card) => (
            <PlayingCard
              key={card.id}
              card={card}
              selected={selectedForMulligan.has(card.id)}
              onClick={() => toggleMulliganCard(card.id)}
            />
          ))}
        </div>

        {/* 選択枚数インジケーター */}
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

  // ---- ゲーム画面 ----
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center px-4 py-6 gap-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between w-full max-w-sm">
        <Link href="/" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
          ← メニュー
        </Link>
        <h1 className="text-lg font-bold text-slate-200 font-mono tracking-widest">GRID DUEL</h1>
        <div className="w-16 text-right">
          {playerMulliganed && (
            <span className="text-[10px] text-slate-600 font-mono">マリガン済</span>
          )}
        </div>
      </div>

      {/* スコア */}
      <ScoreBoard playerScore={playerScore} cpuScore={cpuScore} round={round} />

      {/* ルール説明 */}
      <details className="w-full max-w-sm">
        <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400 font-mono">
          ルール確認 ▾
        </summary>
        <div className="mt-1 text-xs text-slate-400 bg-slate-900 rounded-lg p-3 space-y-1">
          <p>🃏 基本: 高い方が制圧 → 1点</p>
          <p>✦ スート一致（♠vs♠など）: 低い方が制圧 → 2点！</p>
          <p>⚪ 同値 → 引き分け（誰も取れない）</p>
          <p>✨ 縦横斜え3マス並び → +1点ボーナス</p>
          <p>⭕ 中央マスは0点（スート一致でも0点）</p>
        </div>
      </details>

      {/* グリッド */}
      <Grid grid={grid} currentRound={round} isRevealing={isRevealing} />

      {/* マリガン捨て札（両者公開） */}
      {(mulliganDiscardPlayer.length > 0 || mulliganDiscardCpu.length > 0) && (
        <div className="w-full max-w-sm flex gap-4">
          {mulliganDiscardPlayer.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-600 font-mono mb-1">あなたの捨て札</p>
              <div className="flex gap-1 flex-wrap">
                {mulliganDiscardPlayer.map((c) => (
                  <PlayingCard key={c.id} card={c} small />
                ))}
              </div>
            </div>
          )}
          {mulliganDiscardCpu.length > 0 && (
            <div>
              <p className="text-[10px] text-slate-600 font-mono mb-1">CPUの捨て札</p>
              <div className="flex gap-1 flex-wrap">
                {mulliganDiscardCpu.map((c) => (
                  <PlayingCard key={c.id} card={c} small />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ラウンド結果メッセージ */}
      <AnimatePresence mode="wait">
        {resultMessage && phase !== 'GAME_OVER' && (
          <motion.div
            key={`${round}-${lastResult}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className={`font-bold ${resultColor} ${lastSuitMatch ? 'text-base' : 'text-sm'}`}
          >
            {resultMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ドロー通知（中身は非公開） */}
      <AnimatePresence>
        {phase === 'NEXT_ROUND' && (pendingDraw.player || pendingDraw.cpu) && (
          <motion.div
            key="draw-notice"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-xs font-mono text-slate-400"
          >
            {pendingDraw.player ? 'あなたが1枚ドロー' : 'CPUが1枚ドロー'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* プレイヤーの手札 — タップで即決定 */}
      <div className="w-full max-w-sm">
        <div className="text-xs text-slate-500 font-mono mb-2 text-center">
          {isSelecting ? 'カードをタップして出す' : '　'}
        </div>
        <Hand
          hand={playerHand}
          selectedCard={selectedCard}
          onSelect={selectCard}
          disabled={!isSelecting}
        />
      </div>

      {/* 状態表示 */}
      {!isSelecting && phase !== 'GAME_OVER' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-slate-500 text-sm font-mono animate-pulse"
        >
          {phase === 'REVEALING' ? 'カードをめくっています...' : '判定中...'}
        </motion.div>
      )}

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

'use client';

import { Card } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { B1 } from '@letele/playing-cards';
import PlayingCard from './PlayingCard';

interface Props {
  show: boolean;
  isPlaced: boolean;   // true = PLACED フェーズ（裏面 + DUEL!）/ false = REVEALING（フリップ + 勝敗）
  playerCard: Card | null;
  cpuCard: Card | null;
  result: 'player' | 'cpu' | 'tie' | null;
  suitMatch: boolean;
  playerLabel?: string;   // デフォルト "YOU"
  opponentLabel?: string; // デフォルト "CPU"
}

const RESULT_CONFIG = {
  player: { label: 'WIN!', color: 'text-blue-300' },
  cpu:    { label: 'LOSE', color: 'text-red-400' },
  tie:    { label: 'DRAW', color: 'text-slate-400' },
};

// 裏面カード（PLACED フェーズ用）
function FaceDownCard() {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.25 }}
      style={{ width: 72, height: 100 }}
    >
      <B1 width={72} height={100} />
    </motion.div>
  );
}

// 表向きカード（REVEALING フェーズ用）
function FlipCard({ card, delay }: { card: Card; delay: number }) {
  return (
    <motion.div
      initial={{ rotateY: 90, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
      style={{ perspective: 600 }}
    >
      <PlayingCard card={card} />
    </motion.div>
  );
}

export default function RevealOverlay({ show, isPlaced, playerCard, cpuCard, result, suitMatch, playerLabel = 'YOU', opponentLabel = 'CPU' }: Props) {
  const cfg = result ? RESULT_CONFIG[result] : null;

  return (
    <AnimatePresence>
      {show && playerCard && cpuCard && (
        <motion.div
          key="reveal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/85 gap-8"
        >
          {/* カード2枚 */}
          <div className="flex items-center gap-8">
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-mono text-blue-300 tracking-widest">{playerLabel}</span>
              {isPlaced ? <FaceDownCard /> : <FlipCard card={playerCard} delay={0} />}
            </div>

            <span className="text-2xl font-bold text-slate-500">vs</span>

            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-mono text-red-300 tracking-widest">{opponentLabel}</span>
              {isPlaced ? <FaceDownCard /> : <FlipCard card={cpuCard} delay={0.2} />}
            </div>
          </div>

          {/* PLACED フェーズ: DUEL! テキスト */}
          {isPlaced && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [1.2, 1, 1.1, 1], opacity: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="text-5xl font-black tracking-[0.2em] text-white"
              style={{ textShadow: '0 0 30px rgba(255,255,255,0.4)' }}
            >
              DUEL!
            </motion.div>
          )}

          {/* REVEALING フェーズ: 勝敗テキスト */}
          {!isPlaced && (
            <AnimatePresence>
              {cfg && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.6, type: 'spring', stiffness: 300 }}
                  className="flex flex-col items-center gap-1"
                >
                  <span className={`text-4xl font-black tracking-widest ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  {suitMatch && result === 'player' && (
                    <span className="text-sm text-yellow-300 font-mono">✦ SUIT MATCH +2pt</span>
                  )}
                  {suitMatch && result === 'cpu' && (
                    <span className="text-sm text-slate-400 font-mono">✦ SUIT MATCH -2pt</span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

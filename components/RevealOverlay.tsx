'use client';

import { Card } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import PlayingCard from './PlayingCard';

interface Props {
  show: boolean;
  playerCard: Card | null;
  cpuCard: Card | null;
  result: 'player' | 'cpu' | 'tie' | null;
  suitMatch: boolean;
}

const RESULT_CONFIG = {
  player: { label: 'WIN!', color: 'text-blue-300' },
  cpu:    { label: 'LOSE', color: 'text-red-400' },
  tie:    { label: 'DRAW', color: 'text-slate-400' },
};

// カード1枚のフリップアニメーション
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

export default function RevealOverlay({ show, playerCard, cpuCard, result, suitMatch }: Props) {
  const cfg = result ? RESULT_CONFIG[result] : null;

  return (
    <AnimatePresence>
      {show && playerCard && cpuCard && (
        <motion.div
          key="reveal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/80 gap-6"
        >
          {/* カード2枚 */}
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-mono text-red-300 tracking-widest">CPU</span>
              <FlipCard card={cpuCard} delay={0} />
            </div>

            <span className="text-2xl font-bold text-slate-500">vs</span>

            <div className="flex flex-col items-center gap-2">
              <span className="text-xs font-mono text-blue-300 tracking-widest">YOU</span>
              <FlipCard card={playerCard} delay={0.2} />
            </div>
          </div>

          {/* 勝敗テキスト */}
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
                {suitMatch && result !== 'tie' && (
                  <span className="text-sm text-yellow-300 font-mono">✦ スート一致</span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

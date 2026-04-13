'use client';

import { Card } from '@/lib/types';
import { motion } from 'framer-motion';
import * as Cards from '@letele/playing-cards';

interface Props {
  card: Card;
  selected?: boolean;
  onClick?: () => void;
  small?: boolean;
  className?: string;
}

const SUIT_MAP: Record<string, string> = {
  '♠': 'S',
  '♥': 'H',
  '♦': 'D',
  '♣': 'C',
};

const RANK_MAP: Record<number, string> = {
  14: 'a',
  11: 'j',
  12: 'q',
  13: 'k',
};

function getCardComponent(card: Card) {
  const suit = SUIT_MAP[card.suit];
  const rank = RANK_MAP[card.rank] ?? String(card.rank);
  const key = `${suit}${rank}` as keyof typeof Cards;
  return (Cards[key] as React.ComponentType<React.SVGProps<SVGSVGElement>>) ?? null;
}

export default function PlayingCard({
  card,
  selected = false,
  onClick,
  small = false,
  className = '',
}: Props) {
  const CardSvg = getCardComponent(card);
  const width = small ? 48 : 64;

  return (
    <motion.div
      onClick={onClick}
      whileHover={onClick ? { y: -6, scale: 1.05 } : {}}
      whileTap={onClick ? { scale: 0.97 } : {}}
      className={`
        inline-block rounded-lg select-none
        ${selected ? 'ring-2 ring-yellow-300 shadow-yellow-200' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      style={{ width, lineHeight: 0 }}
    >
      {CardSvg ? (
        <CardSvg width={width} height="auto" style={{ display: 'block', borderRadius: 6 }} />
      ) : (
        <div
          style={{ width, height: width * 1.4 }}
          className="bg-white rounded-lg border border-slate-300 flex items-center justify-center text-xs text-slate-500"
        >
          ?
        </div>
      )}
    </motion.div>
  );
}

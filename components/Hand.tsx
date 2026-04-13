'use client';

import { Card } from '@/lib/types';
import PlayingCard from './PlayingCard';
import { useState, useEffect } from 'react';

interface Props {
  hand: Card[];
  selectedCard: Card | null;
  onSelect: (card: Card) => void;
  disabled?: boolean;
}

export default function Hand({ hand, selectedCard, onSelect, disabled = false }: Props) {
  // マウント直後のクリックキャリーオーバー防止（前ページのクリックが引き継がれるSPA問題対策）
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(t);
  }, []);

  const isInteractive = ready && !disabled;

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {hand.map((card) => (
        <PlayingCard
          key={card.id}
          card={card}
          selected={selectedCard?.id === card.id}
          onClick={isInteractive ? () => onSelect(card) : undefined}
          className={!isInteractive ? 'opacity-50' : ''}
        />
      ))}
    </div>
  );
}

'use client';

import { Card } from '@/lib/types';
import PlayingCard from './PlayingCard';
import { useState, useEffect } from 'react';

interface Props {
  hand: Card[];
  selectedCard: Card | null;
  onSelect: (card: Card) => void;
  disabled?: boolean;
  mulliganSelected?: Set<string>; // マリガン画面用
  onMulliganToggle?: (id: string) => void;
}

export default function Hand({ hand, selectedCard, onSelect, disabled = false, mulliganSelected, onMulliganToggle }: Props) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(t);
  }, []);

  const isInteractive = ready && !disabled;
  const count = hand.length;

  // カード幅とオーバーラップ量
  const CARD_W = 64;
  const overlap = count <= 5 ? 12 : count <= 7 ? 20 : 28;
  const totalWidth = CARD_W + (count - 1) * (CARD_W - overlap);

  return (
    <div className="flex justify-center">
      <div
        className="relative"
        style={{ width: totalWidth, height: 110 }}
      >
        {hand.map((card, i) => {
          const isMulliganSel = mulliganSelected?.has(card.id) ?? false;
          const isSelected = selectedCard?.id === card.id || isMulliganSel;
          const left = i * (CARD_W - overlap);
          const zIndex = i; // 右のカードが手前

          return (
            <div
              key={card.id}
              className="absolute"
              style={{
                left,
                zIndex: isSelected ? count + 10 : zIndex,
                transition: 'transform 0.15s ease, z-index 0s',
                transform: isSelected ? 'translateY(-14px)' : 'translateY(0)',
              }}
              onClick={() => {
                if (!ready) return;
                if (onMulliganToggle) {
                  onMulliganToggle(card.id);
                } else if (isInteractive) {
                  onSelect(card);
                }
              }}
            >
              <PlayingCard
                card={card}
                selected={isSelected}
                onClick={undefined} // 親divでハンドリング
                className={!isInteractive && !onMulliganToggle ? 'opacity-50' : ''}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

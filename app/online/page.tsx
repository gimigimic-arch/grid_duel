'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOnlineStore } from '@/store/onlineStore';
import { Card } from '@/lib/types';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

function RuleModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center px-4"
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm overflow-hidden"
      >
        <div className="border-b border-slate-700 px-6 py-4 text-center space-y-1">
          <h2 className="text-emerald-400 font-bold tracking-[0.25em] font-mono text-base mb-2">RULE</h2>
          <p className="text-slate-200 text-base font-bold">9マスを奪い合い、得点が多い方の勝ち。</p>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="space-y-2">
            <p className="text-[10px] font-mono text-slate-500 tracking-widest">勝敗判定</p>
            <RuleItem icon="▷" text="絵柄が違う → 高い方が制圧 → 1pt" />
            <p className="text-slate-500 text-xs pl-8">強さ: A &gt; K &gt; Q &gt; J &gt; 10 … 2</p>
            <div className="bg-slate-800 rounded-lg px-3 py-2 flex items-start gap-3">
              <span className="text-emerald-400 text-sm flex-shrink-0 mt-0.5">✦</span>
              <p className="text-slate-200 text-sm font-bold">
                絵柄が同じ → 低い方が制圧 → <span className="text-emerald-400">2pt</span>
              </p>
            </div>
            <RuleItem icon="⚪" text="同じ数字 → 引き分け" small />
          </div>
          <div className="border-t border-slate-700 pt-3 space-y-2">
            <p className="text-[10px] font-mono text-slate-500 tracking-widest">得点</p>
            <RuleItem icon="✨" text="3マス一列揃え → +1ptボーナス" small />
            <RuleItem icon="⭕" text="中央マスは制圧しても無得点" small />
          </div>
          <div className="border-t border-slate-700 pt-3 space-y-2">
            <p className="text-[10px] font-mono text-slate-500 tracking-widest">その他</p>
            <RuleItem icon="🔄" text="開始前に手札を引き直せる（1回）" small />
            <RuleItem icon="📥" text="制圧された側が山札から1枚引く" small />
          </div>
        </div>
        <div className="px-6 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold transition-colors"
          >
            閉じる
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function RuleItem({ icon, text, small }: { icon: string; text: string; small?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${small ? 'text-xs' : 'text-sm'}`}>
      <span className="w-5 text-center flex-shrink-0">{icon}</span>
      <span className={small ? 'text-slate-400' : 'text-slate-300'}>{text}</span>
    </div>
  );
}

function OnlineLobbyInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setRoom = useOnlineStore((s) => s.setRoom);

  const initialCode = searchParams.get('join')?.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4) ?? '';
  const [mode, setMode] = useState<'none' | 'create' | 'join'>(initialCode ? 'join' : 'none');
  const [joinCode, setJoinCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ruleOpen, setRuleOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialCode && inputRef.current) {
      inputRef.current.value = initialCode;
    }
  }, [initialCode]);

  function applyClean(el: HTMLInputElement) {
    const val = el.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4);
    el.value = val;
    setJoinCode(val);
  }

  async function handleCreate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/rooms', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRoom(data.code, data.playerId, data.role, data.hand as Card[]);
      router.push(`/online/${data.code}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました');
      setLoading(false);
    }
  }

  async function handleJoin() {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 4) {
      setError('4文字のルームコードを入力してください');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rooms/${code}/join`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRoom(data.code, data.playerId, data.role, data.hand as Card[]);
      router.push(`/online/${data.code}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-8 px-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-widest text-emerald-400 font-mono">GRID DUEL</h1>
        <p className="text-slate-400 text-sm font-mono mt-1">オンライン対戦</p>
      </div>

      {mode === 'none' && (
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button
            onClick={() => setMode('create')}
            className="py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-lg transition-colors"
          >
            ルームを作る
          </button>
          <button
            onClick={() => setMode('join')}
            className="py-4 rounded-xl bg-slate-700 hover:bg-slate-600 font-bold text-lg transition-colors"
          >
            ルームに参加
          </button>
          <Link href="/" className="text-center text-slate-500 text-sm hover:text-slate-300 transition-colors">
            ← メニューへ
          </Link>
        </div>
      )}

      {mode === 'create' && (
        <div className="flex flex-col gap-4 w-full max-w-xs items-center">
          <p className="text-slate-300 text-sm text-center">
            ルームを作成して、相手にコードを共有してください。
          </p>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-lg transition-colors disabled:opacity-50"
          >
            {loading ? '作成中...' : 'ルーム作成'}
          </button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button onClick={() => setMode('none')} className="text-slate-500 text-sm hover:text-slate-300">
            ← 戻る
          </button>
        </div>
      )}

      {mode === 'join' && (
        <div className="flex flex-col gap-4 w-full max-w-xs items-center">
          <input
            ref={inputRef}
            type="text"
            defaultValue={initialCode}
            onInput={(e) => {
              if ((e.nativeEvent as InputEvent).isComposing) return;
              applyClean(e.target as HTMLInputElement);
            }}
            onCompositionEnd={(e) => {
              applyClean(e.target as HTMLInputElement);
            }}
            placeholder="ルームコード（4文字）"
            maxLength={8}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            inputMode="url"
            className="w-full py-3 px-4 rounded-xl bg-slate-800 border border-slate-600 text-white text-center text-2xl font-mono tracking-widest uppercase outline-none focus:border-emerald-400"
          />
          <button
            onClick={handleJoin}
            disabled={loading || joinCode.length !== 4}
            className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-lg transition-colors disabled:opacity-50"
          >
            {loading ? '接続中...' : '参加する'}
          </button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            onClick={() => setRuleOpen(true)}
            className="text-slate-500 text-sm hover:text-slate-300 transition-colors"
          >
            ルール確認
          </button>
          <button onClick={() => setMode('none')} className="text-slate-500 text-sm hover:text-slate-300">
            ← 戻る
          </button>
        </div>
      )}

      <AnimatePresence>
        {ruleOpen && <RuleModal onClose={() => setRuleOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}

export default function OnlineLobbyPage() {
  return (
    <Suspense>
      <OnlineLobbyInner />
    </Suspense>
  );
}

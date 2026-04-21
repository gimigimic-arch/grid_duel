'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useOnlineStore } from '@/store/onlineStore';
import { Card } from '@/lib/types';
import Link from 'next/link';

export default function OnlineLobbyPage() {
  const router = useRouter();
  const setRoom = useOnlineStore((s) => s.setRoom);

  const [mode, setMode] = useState<'none' | 'create' | 'join'>('none');
  const [codeLength, setCodeLength] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 4分割ボックス用 ref（1文字ずつ別inputにすることでIMEが入り込む余地をなくす）
  const ref0 = useRef<HTMLInputElement>(null);
  const ref1 = useRef<HTMLInputElement>(null);
  const ref2 = useRef<HTMLInputElement>(null);
  const ref3 = useRef<HTMLInputElement>(null);
  const boxRefs = [ref0, ref1, ref2, ref3];

  function getCode() {
    return boxRefs.map(r => r.current?.value ?? '').join('');
  }

  function syncLength() {
    setCodeLength(boxRefs.filter(r => r.current?.value).length);
  }

  function commitChar(idx: number, el: HTMLInputElement) {
    const char = el.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(-1);
    el.value = char;
    syncLength();
    if (char && idx < 3) boxRefs[idx + 1].current?.focus();
  }

  function handleBoxInput(idx: number, e: React.FormEvent<HTMLInputElement>) {
    // IME変換中（isComposing）は無視して onCompositionEnd に任せる
    if ((e.nativeEvent as InputEvent).isComposing) return;
    commitChar(idx, e.currentTarget);
  }

  function handleBoxCompositionEnd(idx: number, e: React.CompositionEvent<HTMLInputElement>) {
    commitChar(idx, e.currentTarget as HTMLInputElement);
  }

  function handleBoxKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !e.currentTarget.value && idx > 0) {
      boxRefs[idx - 1].current?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4);
    text.split('').forEach((char, i) => { if (boxRefs[i].current) boxRefs[i].current!.value = char; });
    setCodeLength(text.length);
    boxRefs[Math.min(text.length, 3)].current?.focus();
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
    const code = getCode().trim().toUpperCase();
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
          <div className="flex gap-2 w-full justify-center">
            {([ref0, ref1, ref2, ref3] as React.RefObject<HTMLInputElement>[]).map((ref, idx) => (
              <input
                key={idx}
                ref={ref}
                type="text"
                maxLength={2}
                onInput={(e) => handleBoxInput(idx, e)}
                onCompositionEnd={(e) => handleBoxCompositionEnd(idx, e)}
                onKeyDown={(e) => handleBoxKeyDown(idx, e)}
                onPaste={idx === 0 ? handlePaste : undefined}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                inputMode="url"
                className="w-14 h-16 rounded-xl bg-slate-800 border border-slate-600 text-white text-center text-2xl font-mono uppercase outline-none focus:border-emerald-400 caret-transparent"
              />
            ))}
          </div>
          <button
            onClick={handleJoin}
            disabled={loading || codeLength !== 4}
            className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-lg transition-colors disabled:opacity-50"
          >
            {loading ? '接続中...' : '参加する'}
          </button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button onClick={() => setMode('none')} className="text-slate-500 text-sm hover:text-slate-300">
            ← 戻る
          </button>
        </div>
      )}
    </div>
  );
}

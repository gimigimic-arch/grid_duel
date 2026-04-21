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
  const [codeLength, setCodeLength] = useState(0); // ボタンのdisabled制御用
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // DOM を直接操作して入力値を正規化（controlled input を使わないことで
  // multi-tap の "replace" が React の re-render による "append" に化けるのを防ぐ）
  function applyClean(el: HTMLInputElement) {
    const val = el.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4);
    el.value = val;
    setCodeLength(val.length);
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
    const code = (inputRef.current?.value ?? '').trim().toUpperCase();
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
            onChange={(e) => {
              if (e.nativeEvent.isComposing) return;
              applyClean(e.target);
            }}
            onCompositionEnd={(e) => {
              applyClean(e.target as HTMLInputElement);
            }}
            placeholder="ルームコード（4文字）"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            inputMode="latin"
            className="w-full py-3 px-4 rounded-xl bg-slate-800 border border-slate-600 text-white text-center text-2xl font-mono tracking-widest uppercase outline-none focus:border-emerald-400"
          />
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

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-8 px-4">
      <div className="text-center space-y-2">
        <h1 className="text-5xl font-bold tracking-widest text-emerald-400 font-mono">
          GRID DUEL
        </h1>
        <p className="text-slate-400 text-sm font-mono">
          トランプ × 3×3 制圧ゲーム
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full space-y-3">
        <h2 className="text-slate-300 font-bold text-center mb-4">ルール</h2>
        <Rule icon="🃏" text="基本: 高い方が制圧 → 1点" />
        <Rule icon="✦" text="スート一致（♠vs♠など）: 低い方が制圧 → 2点！" />
        <Rule icon="⚪" text="同値 → 引き分け（誰も取れない）" />
        <Rule icon="✨" text="縦横斜え3マス並び → +1点ボーナス" />
        <Rule icon="⭕" text="中央マスは0点（スート一致でも0点）" />
      </div>

      <Link
        href="/game"
        className="px-12 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xl transition-colors shadow-lg"
      >
        ゲームスタート
      </Link>

      <p className="text-slate-600 text-xs font-mono">
        Built with Next.js · TypeScript · Tailwind · Framer Motion · Zustand
      </p>
    </div>
  );
}

function Rule({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span>{icon}</span>
      <span className="text-slate-300">{text}</span>
    </div>
  );
}

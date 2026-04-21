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

      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full overflow-hidden">
        {/* ヘッダー */}
        <div className="border-b border-slate-700 px-6 py-4 text-center space-y-1">
          <h2 className="text-emerald-400 font-bold tracking-[0.25em] font-mono text-base mb-2">RULE</h2>
          <p className="text-slate-200 text-base font-bold">9マスを奪い合い、得点が多い方の勝ち。</p>
        </div>
        {/* ルール本文 */}
        <div className="px-6 py-4 space-y-4">
          {/* 勝敗判定 */}
          <div className="space-y-2">
            <p className="text-[10px] font-mono text-slate-500 tracking-widest">勝敗判定</p>
            <Rule icon="▷" text="絵柄が違う → 高い方が制圧 → 1pt" />
            <p className="text-slate-500 text-xs pl-8">強さ: A &gt; K &gt; Q &gt; J &gt; 10 … 2</p>
            <div className="bg-slate-800 rounded-lg px-3 py-2 flex items-start gap-3">
              <span className="text-emerald-400 text-sm flex-shrink-0 mt-0.5">✦</span>
              <div>
                <p className="text-slate-200 text-sm font-bold">
                  絵柄が同じ → 低い方が制圧 → <span className="text-emerald-400">2pt</span>
                </p>
              </div>
            </div>
            <Rule icon="⚪" text="同じ数字 → 引き分け" small />
          </div>
          {/* 得点 */}
          <div className="border-t border-slate-700 pt-3 space-y-2">
            <p className="text-[10px] font-mono text-slate-500 tracking-widest">得点</p>
            <Rule icon="✨" text="3マス一列揃え → +1ptボーナス" small />
            <Rule icon="⭕" text="中央マスは制圧しても無得点" small />
          </div>
          {/* その他 */}
          <div className="border-t border-slate-700 pt-3 space-y-2">
            <p className="text-[10px] font-mono text-slate-500 tracking-widest">その他</p>
            <Rule icon="🔄" text="開始前に手札を引き直せる（1回）" small />
            <Rule icon="📥" text="制圧された側が山札から1枚引く" small />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          href="/game"
          className="text-center px-12 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xl transition-colors shadow-lg"
        >
          ゲームスタート
        </Link>
        <Link
          href="/online"
          className="text-center px-12 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-base transition-colors"
        >
          オンライン対戦
        </Link>
      </div>

      <p className="text-slate-600 text-xs font-mono">
        Built with Next.js · TypeScript · Tailwind · Framer Motion · Zustand
      </p>
    </div>
  );
}

function Rule({ icon, text, small }: { icon: string; text: string; small?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${small ? 'text-xs' : 'text-sm'}`}>
      <span className="w-5 text-center flex-shrink-0">{icon}</span>
      <span className={small ? 'text-slate-400' : 'text-slate-300'}>{text}</span>
    </div>
  );
}

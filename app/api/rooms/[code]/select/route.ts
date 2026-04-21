import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';
import { supabaseServer as supabase } from '@/lib/supabase-server';
import { Card } from '@/lib/types';
import { compareCards, isSuitMatch, countLines } from '@/lib/engine';

const ROOM_TTL = 3600;

type OnlineGridCell = {
  owner: 'host' | 'guest' | 'tie' | null;
  hostCard: Card | null;
  guestCard: Card | null;
  suitMatch: boolean;
};

function calcOnlineScore(grid: OnlineGridCell[]): { host: number; guest: number } {
  let host = 0;
  let guest = 0;

  for (let i = 0; i < grid.length; i++) {
    const cell = grid[i];
    if (!cell.owner || cell.owner === 'tie') continue;
    const pts = i === 4 ? 0 : cell.suitMatch ? 2 : 1;
    if (cell.owner === 'host') host += pts;
    else guest += pts;
  }

  // ラインボーナス
  const LINES = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6],
  ];
  for (const line of LINES) {
    if (line.every((i) => grid[i].owner === 'host')) host++;
    if (line.every((i) => grid[i].owner === 'guest')) guest++;
  }

  return { host, guest };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { playerId, cardId } = await req.json() as {
    playerId: string;
    cardId: string;
  };

  const redis = getRedis();

  // GAME_OVER 後のカード選択を拒否
  const { data: gameStateCheck } = await supabase
    .from('rooms')
    .select('shared_state')
    .eq('code', code)
    .single();
  if ((gameStateCheck?.shared_state as Record<string, unknown>)?.phase === 'GAME_OVER') {
    return NextResponse.json({ error: 'Game is over' }, { status: 409 });
  }

  // ホスト・ゲスト判別
  const hostId = await redis.get(`room:${code}:host_id`);
  const isHost = hostId === playerId;
  const role = isHost ? 'host' : 'guest';
  const opponentRole = isHost ? 'guest' : 'host';

  // カードIDを保存（60秒TTL：1ラウンド分）
  await redis.setex(`room:${code}:${role}_card`, 60, cardId);

  // 相手のカードが揃っているか確認
  const opponentCardId = await redis.get(`room:${code}:${opponentRole}_card`);

  if (!opponentCardId) {
    // 相手はまだ選んでいない → WAITINGフラグを立てる
    const { data: room } = await supabase
      .from('rooms')
      .select('shared_state')
      .eq('code', code)
      .single();

    if (room) {
      const state = room.shared_state as Record<string, unknown>;
      await supabase.from('rooms').update({
        shared_state: { ...state, [`${role}_waiting`]: true },
      }).eq('code', code);
    }
    return NextResponse.json({ status: 'waiting' });
  }

  // 両者揃った → 解決
  const hostCardId = isHost ? cardId : opponentCardId;
  const guestCardId = isHost ? opponentCardId : cardId;

  // 手札からカードオブジェクトを取得
  const hostHandRaw = await redis.get(`room:${code}:host_hand`);
  const guestHandRaw = await redis.get(`room:${code}:guest_hand`);
  if (!hostHandRaw || !guestHandRaw) {
    return NextResponse.json({ error: 'Room expired' }, { status: 410 });
  }

  const hostHand: Card[] = JSON.parse(hostHandRaw);
  const guestHand: Card[] = JSON.parse(guestHandRaw);
  const hostCard = hostHand.find((c) => c.id === hostCardId)!;
  const guestCard = guestHand.find((c) => c.id === guestCardId)!;

  // 勝敗判定（host = 'a', guest = 'b'）
  const result = compareCards(hostCard, guestCard);
  const suitMatch = isSuitMatch(hostCard, guestCard);
  const cellOwner: 'host' | 'guest' | 'tie' =
    result === 'a' ? 'host' : result === 'b' ? 'guest' : 'tie';

  // 現在の shared_state を取得してグリッドを更新
  const { data: room } = await supabase
    .from('rooms')
    .select('shared_state')
    .eq('code', code)
    .single();

  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

  const state = room.shared_state as {
    round: number;
    grid: OnlineGridCell[];
    hostScore?: number;
    guestScore?: number;
  };

  // 次の空きセルを使う（グリッドが唯一の正確なソース）
  const currentGrid: OnlineGridCell[] = state.grid ?? Array(9).fill(null).map(() => ({
    owner: null, hostCard: null, guestCard: null, suitMatch: false,
  }));
  const cellIndex = currentGrid.findIndex((c) => c.owner === null);

  if (cellIndex === -1) {
    return NextResponse.json({ error: 'No empty cells' }, { status: 400 });
  }

  const newGrid = [...currentGrid];
  newGrid[cellIndex] = { owner: cellOwner, hostCard, guestCard, suitMatch };

  const { host: hostScore, guest: guestScore } = calcOnlineScore(newGrid);

  // 負けた側がドロー
  const loser: 'host' | 'guest' | null =
    cellOwner === 'host' ? 'guest' : cellOwner === 'guest' ? 'host' : null;

  const deckRaw = await redis.get(`room:${code}:deck`);
  let deck: Card[] = deckRaw ? JSON.parse(deckRaw) : [];

  const newHostHand = hostHand.filter((c) => c.id !== hostCardId);
  const newGuestHand = guestHand.filter((c) => c.id !== guestCardId);
  let pendingDraw: string | null = null;

  if (loser && deck.length > 0) {
    const drawnCard = deck.shift()!;
    if (loser === 'host') newHostHand.push(drawnCard);
    else newGuestHand.push(drawnCard);
    pendingDraw = loser;
    await redis.setex(`room:${code}:deck`, ROOM_TTL, JSON.stringify(deck));
  }

  await redis.setex(`room:${code}:host_hand`, ROOM_TTL, JSON.stringify(newHostHand));
  await redis.setex(`room:${code}:guest_hand`, ROOM_TTL, JSON.stringify(newGuestHand));

  // カード選択をクリア
  await redis.del(`room:${code}:host_card`, `room:${code}:guest_card`);

  const nextRound = cellIndex + 2; // 1-based、次のラウンド
  const gameOver = cellIndex >= 8; // 最後のセル（8）が埋まった

  const winner: string | null = gameOver
    ? hostScore > guestScore ? 'host' : guestScore > hostScore ? 'guest' : 'draw'
    : null;

  // 捨て札・その他の既存フィールドを引き継ぐ
  const prevState = (room.shared_state as Record<string, unknown>) ?? {};

  const newSharedState = {
    ...prevState,
    round: cellIndex + 1, // 今プレイしたラウンド（1-based）
    phase: gameOver ? 'GAME_OVER' : 'PLACED',
    grid: newGrid,
    hostScore,
    guestScore,
    winner,
    lastResult: cellOwner,
    lastSuitMatch: suitMatch,
    pendingDraw,
    hostHandCount: newHostHand.length,
    guestHandCount: newGuestHand.length,
    host_waiting: false,
    guest_waiting: false,
  };

  await supabase.from('rooms').update({ shared_state: newSharedState }).eq('code', code);

  return NextResponse.json({ status: 'resolved' });
}

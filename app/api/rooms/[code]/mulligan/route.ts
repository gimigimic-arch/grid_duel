import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';
import { supabaseServer as supabase } from '@/lib/supabase-server';
import { Card } from '@/lib/types';

const ROOM_TTL = 3600;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { playerId, selectedCardIds } = await req.json() as {
    playerId: string;
    selectedCardIds: string[];
  };

  const redis = getRedis();

  // ホスト・ゲスト判別
  const hostId = await redis.get(`room:${code}:host_id`);
  const isHost = hostId === playerId;
  const role = isHost ? 'host' : 'guest';

  const handKey = `room:${code}:${role}_hand`;
  const deckKey = `room:${code}:deck`;

  // 重複マリガン防止: すでにready済みなら拒否
  const { data: existingRoom } = await supabase
    .from('rooms')
    .select('host_ready, guest_ready, shared_state')
    .eq('code', code)
    .single();

  if (!existingRoom) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

  const alreadyReady = isHost ? existingRoom.host_ready : existingRoom.guest_ready;
  if (alreadyReady) {
    return NextResponse.json({ error: 'Already ready' }, { status: 409 });
  }

  // ゲーム開始後のマリガン防止
  const sharedPhase = (existingRoom.shared_state as Record<string, unknown>)?.phase;
  if (sharedPhase === 'SELECTING' || sharedPhase === 'PLACED' || sharedPhase === 'GAME_OVER') {
    return NextResponse.json({ error: 'Game already started' }, { status: 409 });
  }

  const handRaw = await redis.get(handKey);
  const deckRaw = await redis.get(deckKey);
  if (!handRaw || !deckRaw) {
    return NextResponse.json({ error: 'Room expired' }, { status: 410 });
  }

  let hand: Card[] = JSON.parse(handRaw);
  let deck: Card[] = JSON.parse(deckRaw);

  // 選択されたカードを引き直す（デッキ枚数チェック）
  const discard = hand.filter((c) => selectedCardIds.includes(c.id));
  const available = Math.min(discard.length, deck.length);
  const drawn = deck.splice(0, available);
  const newHand = [
    ...hand.filter((c) => !selectedCardIds.includes(c.id)),
    ...drawn,
  ];

  await redis.setex(handKey, ROOM_TTL, JSON.stringify(newHand));
  await redis.setex(deckKey, ROOM_TTL, JSON.stringify(deck));

  // 捨て札と手札枚数を shared_state に保存
  const { data: stateBeforeReady } = await supabase
    .from('rooms')
    .select('shared_state')
    .eq('code', code)
    .single();
  const stateSnapshot = (stateBeforeReady?.shared_state as Record<string, unknown>) ?? {};
  const discardKey = isHost ? 'hostDiscard' : 'guestDiscard';
  const handCountKey = isHost ? 'hostHandCount' : 'guestHandCount';
  await supabase.from('rooms').update({
    shared_state: {
      ...stateSnapshot,
      [discardKey]: discard,
      [handCountKey]: newHand.length,
    },
  }).eq('code', code);

  // ready フラグをSupabaseに更新
  const readyField = isHost ? 'host_ready' : 'guest_ready';
  await supabase.from('rooms').update({ [readyField]: true }).eq('code', code);

  // 両者readyなら shared_state の phase を SELECTING に更新
  const { data: room } = await supabase
    .from('rooms')
    .select('host_ready, guest_ready')
    .eq('code', code)
    .single();

  if (room) {
    const hostReady = isHost ? true : room.host_ready;
    const guestReady = isHost ? room.guest_ready : true;

    if (hostReady && guestReady) {
      // shared_state を取得してマージ（上書きしない）
      const { data: roomState } = await supabase
        .from('rooms')
        .select('shared_state')
        .eq('code', code)
        .single();
      const currentState = (roomState?.shared_state as Record<string, unknown>) ?? {};
      await supabase
        .from('rooms')
        .update({ shared_state: { ...currentState, phase: 'SELECTING' } })
        .eq('code', code);
    }
  }

  return NextResponse.json({ hand: newHand });
}

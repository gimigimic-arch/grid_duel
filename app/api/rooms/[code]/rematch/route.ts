import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';
import { supabaseServer as supabase } from '@/lib/supabase-server';
import { createShuffledHands } from '@/lib/deck';

const ROOM_TTL = 3600;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { playerId } = await req.json() as { playerId: string };

  const redis = getRedis();
  const hostId = await redis.get(`room:${code}:host_id`);
  if (!hostId) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

  const isHost = hostId === playerId;
  const role = isHost ? 'host' : 'guest';

  const { data: room } = await supabase
    .from('rooms')
    .select('shared_state')
    .eq('code', code)
    .single();

  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

  const currentState = (room.shared_state as Record<string, unknown>) ?? {};

  if (currentState.phase !== 'GAME_OVER') {
    return NextResponse.json({ error: 'Game not over' }, { status: 409 });
  }

  const newRematchHost = role === 'host' ? true : !!(currentState.rematch_host);
  const newRematchGuest = role === 'guest' ? true : !!(currentState.rematch_guest);

  // 両者合意 → ルームをリセット
  if (newRematchHost && newRematchGuest) {
    const { playerHand, cpuHand: guestHand, remainingDeck } = createShuffledHands();

    await redis.setex(`room:${code}:host_hand`, ROOM_TTL, JSON.stringify(playerHand));
    await redis.setex(`room:${code}:guest_hand`, ROOM_TTL, JSON.stringify(guestHand));
    await redis.setex(`room:${code}:deck`, ROOM_TTL, JSON.stringify(remainingDeck));
    await redis.del(`room:${code}:host_card`, `room:${code}:guest_card`);

    const resetState = {
      round: 1,
      phase: 'MULLIGAN',
      grid: Array(9).fill(null).map(() => ({
        owner: null, hostCard: null, guestCard: null, suitMatch: false,
      })),
      hostScore: 0,
      guestScore: 0,
      winner: null,
      lastResult: null,
      lastSuitMatch: false,
      pendingDraw: null,
      host_waiting: false,
      guest_waiting: false,
      guestJoined: true,
      hostHandCount: playerHand.length,
      guestHandCount: guestHand.length,
      rematch_host: false,
      rematch_guest: false,
    };

    await supabase.from('rooms').update({
      shared_state: resetState,
      host_ready: false,
      guest_ready: false,
    }).eq('code', code);
    return NextResponse.json({ status: 'rematch_started' });
  }

  // 片方のみ → フラグをセット
  await supabase.from('rooms').update({
    shared_state: {
      ...currentState,
      rematch_host: newRematchHost,
      rematch_guest: newRematchGuest,
    },
  }).eq('code', code);

  return NextResponse.json({ status: 'rematch_requested' });
}

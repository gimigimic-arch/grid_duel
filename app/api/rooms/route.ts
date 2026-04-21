import { NextResponse } from 'next/server';
import { createShuffledHands } from '@/lib/deck';
import { generateRoomCode } from '@/lib/roomCode';
import { getRedis } from '@/lib/redis';
import { supabaseServer as supabase } from '@/lib/supabase-server';

const ROOM_TTL = 3600; // 1時間

export async function POST() {
  const code = generateRoomCode();
  const hostId = crypto.randomUUID();
  const { playerHand, cpuHand: guestHand, remainingDeck } = createShuffledHands();

  const redis = getRedis();

  // ホスト・ゲストの手札をRedisに保存（ゲームロジック用）
  await redis.setex(`room:${code}:host_hand`, ROOM_TTL, JSON.stringify(playerHand));
  await redis.setex(`room:${code}:guest_hand`, ROOM_TTL, JSON.stringify(guestHand));
  await redis.setex(`room:${code}:deck`, ROOM_TTL, JSON.stringify(remainingDeck));
  await redis.setex(`room:${code}:host_id`, ROOM_TTL, hostId);

  // Supabase にルームを作成
  const initialSharedState = {
    round: 1,
    phase: 'MULLIGAN',
    grid: Array(9).fill(null).map(() => ({
      owner: null,
      playerCard: null,
      cpuCard: null,
      suitMatch: false,
    })),
    playerScore: 0,
    cpuScore: 0,
    winner: null,
    lastResult: null,
    lastSuitMatch: false,
  };

  const { error } = await supabase.from('rooms').insert({
    code,
    host_id: hostId,
    shared_state: initialSharedState,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    code,
    playerId: hostId,
    hand: playerHand,
    role: 'host',
  });
}

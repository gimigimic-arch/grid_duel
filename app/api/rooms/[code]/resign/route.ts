import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';
import { supabaseServer as supabase } from '@/lib/supabase-server';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { playerId } = await req.json() as { playerId: string };

  const redis = getRedis();

  // ホスト・ゲスト判別
  const hostId = await redis.get(`room:${code}:host_id`);
  const isHost = hostId === playerId;
  const role = isHost ? 'host' : 'guest';
  const winner = isHost ? 'guest' : 'host';

  // 現在の shared_state を取得
  const { data: room } = await supabase
    .from('rooms')
    .select('shared_state')
    .eq('code', code)
    .single();

  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

  const currentState = (room.shared_state as Record<string, unknown>) ?? {};

  // すでに GAME_OVER なら何もしない
  if (currentState.phase === 'GAME_OVER') {
    return NextResponse.json({ status: 'already_over' });
  }

  await supabase.from('rooms').update({
    shared_state: {
      ...currentState,
      phase: 'GAME_OVER',
      winner,
      resigned: role,
    },
  }).eq('code', code);

  return NextResponse.json({ status: 'resigned' });
}

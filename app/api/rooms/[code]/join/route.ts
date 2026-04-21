import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';
import { supabaseServer as supabase } from '@/lib/supabase-server';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const redis = getRedis();

  // ルームの存在確認
  const { data: room, error } = await supabase
    .from('rooms')
    .select('host_id, guest_id')
    .eq('code', code)
    .single();

  if (error || !room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }
  if (room.guest_id) {
    return NextResponse.json({ error: 'Room is full' }, { status: 409 });
  }

  const guestId = crypto.randomUUID();
  const handRaw = await redis.get(`room:${code}:guest_hand`);
  if (!handRaw) {
    return NextResponse.json({ error: 'Room expired' }, { status: 410 });
  }

  // ゲストIDをSupabaseに登録し、shared_stateにguestJoinedフラグを立てる
  const { data: roomState } = await supabase
    .from('rooms')
    .select('shared_state')
    .eq('code', code)
    .single();
  const currentState = (roomState?.shared_state as Record<string, unknown>) ?? {};
  await supabase.from('rooms').update({
    guest_id: guestId,
    shared_state: { ...currentState, guestJoined: true },
  }).eq('code', code);

  return NextResponse.json({
    code,
    playerId: guestId,
    hand: JSON.parse(handRaw),
    role: 'guest',
  });
}

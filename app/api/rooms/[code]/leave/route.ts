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
  const hostId = await redis.get(`room:${code}:host_id`);
  if (!hostId) return NextResponse.json({ ok: true }); // ルーム消滅済みは無視

  const isHost = hostId === playerId;
  const leaveField = isHost ? 'left_host' : 'left_guest';

  const { data: room } = await supabase
    .from('rooms')
    .select('shared_state')
    .eq('code', code)
    .single();

  if (!room) return NextResponse.json({ ok: true });

  const currentState = (room.shared_state as Record<string, unknown>) ?? {};

  await supabase.from('rooms').update({
    shared_state: { ...currentState, [leaveField]: true },
  }).eq('code', code);

  return NextResponse.json({ ok: true });
}

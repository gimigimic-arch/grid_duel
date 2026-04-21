import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { searchParams } = new URL(req.url);
  const playerId = searchParams.get('playerId');

  if (!playerId) {
    return NextResponse.json({ error: 'playerId required' }, { status: 400 });
  }

  const redis = getRedis();
  const hostId = await redis.get(`room:${code}:host_id`);
  const role = hostId === playerId ? 'host' : 'guest';

  const handRaw = await redis.get(`room:${code}:${role}_hand`);
  if (!handRaw) {
    return NextResponse.json({ error: 'Room expired' }, { status: 410 });
  }

  return NextResponse.json({ hand: JSON.parse(handRaw) });
}

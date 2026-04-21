'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useOnlineStore, OnlineSharedState } from '@/store/onlineStore';

/**
 * Supabase Realtime でルームの shared_state を監視し、
 * onlineStore に反映する
 */
export function useOnlineSync(roomCode: string | null) {
  const setShared = useOnlineStore((s) => s.setShared);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!roomCode) return;

    // Realtime 購読（購読確立後に初回フェッチ → 通知を見逃さない）
    const channel = supabase
      .channel(`room:${roomCode}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `code=eq.${roomCode}`,
        },
        (payload) => {
          const newRow = payload.new as { shared_state: OnlineSharedState };
          if (newRow.shared_state) {
            setShared(newRow.shared_state);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // 購読確立後に初回フェッチ（競合防止）
          supabase
            .from('rooms')
            .select('shared_state')
            .eq('code', roomCode)
            .single()
            .then(({ data }) => {
              if (data?.shared_state) {
                setShared(data.shared_state as OnlineSharedState);
              }
            });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          supabase.removeChannel(channel);
          channelRef.current = null;
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode, setShared]);
}

import { SERVER_HTTP_URL } from "@/services/server";
import type { ChannelInfo, ChannelsResponse } from "@walkie/shared";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

/**
 * Fetches GET /channels and refetches silently whenever the screen regains
 * focus.
 *
 * `refreshing` is only true for a user-initiated pull-to-refresh. Driving
 * RefreshControl from background fetches makes iOS inset the list to show
 * the spinner and then snap back, which looks like a jump on every return.
 */
export function useChannels() {
  const [channels, setChannels] = useState<ChannelInfo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${SERVER_HTTP_URL}/channels`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as ChannelsResponse;
      setChannels(body.channels);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoaded(true);
    }
  }, []);

  /** Pull-to-refresh: shows the spinner. */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return { channels, loaded, refreshing, error, refresh };
}

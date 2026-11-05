import { useConnection } from "@/services/connection";
import type { ChannelInfo } from "@walkie/shared";
import { useEffect, useState } from "react";

/**
 * Live channel overview: subscribes to `channels` snapshots over the shared
 * connection while mounted. Updates arrive whenever anyone joins, leaves, or
 * starts/stops talking in any channel.
 */
export function useChannels() {
  const { status, addListener, watchChannels } = useConnection();
  const [channels, setChannels] = useState<ChannelInfo[] | null>(null);

  useEffect(() => {
    const removeListener = addListener((msg) => {
      if (msg.type === "channels") setChannels(msg.channels);
    });
    const unwatch = watchChannels();
    return () => {
      unwatch();
      removeListener();
    };
  }, [addListener, watchChannels]);

  return { channels: channels ?? [], loaded: channels !== null, status };
}

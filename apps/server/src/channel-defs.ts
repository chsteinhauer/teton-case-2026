import type { ChannelDef } from "@walkie/shared";
import { readFileSync } from "node:fs";

/**
 * Loads the static channel list. Defaults to the bundled test data; point
 * CHANNELS_FILE at another JSON file to use a different set.
 */
export function loadChannelDefs(): ChannelDef[] {
  const file = process.env.CHANNELS_FILE ?? new URL("./data/channels.json", import.meta.url);
  const defs = JSON.parse(readFileSync(file, "utf8")) as ChannelDef[];

  const ids = new Set<string>();
  for (const def of defs) {
    if (!def.id || !def.name) throw new Error(`channel without id/name: ${JSON.stringify(def)}`);
    if (ids.has(def.id)) throw new Error(`duplicate channel id: ${def.id}`);
    ids.add(def.id);
  }
  return defs;
}

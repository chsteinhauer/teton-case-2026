import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { useChannel } from "@/hooks/useChannel";
import * as Device from "expo-device";
import { Pressable, StyleSheet, Text, View } from "react-native";

const CHANNEL = "general";

export default function Home() {
  const { status, selfId, members, talker, startTalking, stopTalking } = useChannel(
    CHANNEL,
    Device.deviceName ?? Device.modelName ?? "Unknown device",
  );

  const iAmTalking = talker !== null && talker === selfId;
  const someoneElseTalking = talker !== null && !iAmTalking;
  const talkerName = members.find((m) => m.id === talker)?.name;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.channel}>#{CHANNEL}</Text>
        <Text style={styles.status}>
          {status === "open" ? `${members.length} online` : status === "connecting" ? "Connecting…" : "Offline"}
        </Text>
      </View>

      <Text style={styles.talker}>
        {iAmTalking ? "You are talking" : someoneElseTalking ? `${talkerName ?? "Someone"} is talking` : " "}
      </Text>

      <Pressable
        disabled={status !== "open" || someoneElseTalking}
        onPressIn={startTalking}
        onPressOut={stopTalking}
        style={[
          styles.ptt,
          iAmTalking && styles.pttActive,
          (status !== "open" || someoneElseTalking) && styles.pttDisabled,
        ]}
      >
        <Text style={styles.pttLabel}>{iAmTalking ? "Release to stop" : "Hold to talk"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: 24, alignItems: "center" },
  header: { alignSelf: "stretch", flexDirection: "row", justifyContent: "space-between" },
  channel: { fontFamily: fonts.semibold, fontSize: 18, color: colors.text },
  status: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  talker: { fontFamily: fonts.medium, fontSize: 16, color: colors.accent, marginTop: 48, minHeight: 24 },
  ptt: {
    marginTop: "auto",
    marginBottom: 48,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.backgroundInverse,
    alignItems: "center",
    justifyContent: "center",
  },
  pttActive: { backgroundColor: colors.accent, transform: [{ scale: 1.05 }] },
  pttDisabled: { opacity: 0.35 },
  pttLabel: { fontFamily: fonts.medium, fontSize: 18, color: colors.textInverse },
});

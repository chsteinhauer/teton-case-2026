import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { useChannel } from "@/hooks/useChannel";
import { deviceName } from "@/utils/device-name";
import { Stack, useLocalSearchParams } from "expo-router";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ChannelScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const insets = useSafeAreaInsets();
  const { status, error, selfId, members, talker, startTalking, stopTalking } = useChannel(id, deviceName);

  const iAmTalking = talker !== null && talker === selfId;
  const someoneElseTalking = talker !== null && !iAmTalking;
  const talkerName = members.find((m) => m.id === talker)?.name;
  const canTalk = status === "open" && !error && !someoneElseTalking;

  const statusText = error
    ? error
    : status === "open"
      ? `${members.length} online`
      : status === "connecting"
        ? "Connecting…"
        : "Offline — retrying";

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom + 24 }]}>
      <Stack.Screen options={{ title: `# ${name ?? id}` }} />

      <View style={styles.statusBar}>
        <View style={[styles.statusDot, { backgroundColor: status === "open" && !error ? colors.success : colors.danger }]} />
        <Text style={styles.statusText}>{statusText}</Text>
      </View>

      <Text style={styles.section}>MEMBERS</Text>
      <FlatList
        style={styles.members}
        data={members}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => {
          const talking = item.id === talker;
          return (
            <View style={styles.member}>
              <View style={[styles.avatar, talking && styles.avatarTalking]}>
                <Text style={styles.avatarText}>{item.name.slice(0, 1).toUpperCase()}</Text>
              </View>
              <Text style={[styles.memberName, talking && { color: colors.text }]}>
                {item.name}
                {item.id === selfId ? " (you)" : ""}
              </Text>
            </View>
          );
        }}
      />

      <Text style={[styles.talker, { color: iAmTalking ? colors.success : colors.warning }]}>
        {iAmTalking ? "You are talking" : someoneElseTalking ? `${talkerName ?? "Someone"} is talking` : " "}
      </Text>

      <Pressable
        disabled={!canTalk && !iAmTalking}
        onPressIn={startTalking}
        onPressOut={stopTalking}
        style={({ pressed }) => [
          styles.ptt,
          pressed && canTalk && styles.pttPressed,
          iAmTalking && styles.pttActive,
          !canTalk && !iAmTalking && styles.pttDisabled,
        ]}
      >
        <Text style={styles.pttLabel}>{iAmTalking ? "Release to stop" : "Hold to talk"}</Text>
      </Pressable>
    </View>
  );
}

const AVATAR = 36;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 16, paddingTop: 12 },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontFamily: fonts.medium, fontSize: 14, color: colors.textSecondary },
  section: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 0.5,
    color: colors.textMuted,
    marginTop: 20,
    marginBottom: 8,
  },
  members: { flexGrow: 0, maxHeight: "40%" },
  member: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  avatarTalking: { borderColor: colors.success },
  avatarText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  memberName: { fontFamily: fonts.medium, fontSize: 15, color: colors.textSecondary },
  talker: { fontFamily: fonts.medium, fontSize: 16, textAlign: "center", marginTop: "auto", marginBottom: 20 },
  ptt: {
    alignSelf: "center",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  pttPressed: { backgroundColor: colors.accentPressed },
  pttActive: { backgroundColor: colors.success, transform: [{ scale: 1.05 }] },
  pttDisabled: { backgroundColor: colors.surfaceRaised },
  pttLabel: { fontFamily: fonts.medium, fontSize: 18, color: colors.textOnAccent },
});

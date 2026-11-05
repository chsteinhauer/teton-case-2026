import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { useChannels } from "@/hooks/useChannels";
import { SERVER_WS_URL } from "@/services/server";
import type { ChannelInfo } from "@walkie/shared";
import { router } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

export default function Channels() {
  const { channels, loaded, status } = useChannels();

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={channels}
      keyExtractor={(c) => c.id}
      ListHeaderComponent={
        <View style={styles.headerRow}>
          <Text style={styles.section}>VOICE CHANNELS</Text>
          {status !== "open" ? <Text style={styles.offline}>Reconnecting…</Text> : null}
        </View>
      }
      ListEmptyComponent={
        !loaded ? (
          status === "closed" ? (
            <Text style={styles.empty}>{`Can't reach the server at\n${SERVER_WS_URL}`}</Text>
          ) : (
            <ActivityIndicator style={styles.spinner} color={colors.textMuted} />
          )
        ) : (
          <Text style={styles.empty}>No channels.</Text>
        )
      }
      renderItem={({ item }) => <ChannelRow channel={item} />}
    />
  );
}

function ChannelRow({ channel }: { channel: ChannelInfo }) {
  return (
    <View>
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={() => router.push({ pathname: "/channel/[id]", params: { id: channel.id, name: channel.name } })}
      >
        <Text style={styles.hash}>#</Text>
        <View style={styles.rowText}>
          <Text style={styles.name}>{channel.name}</Text>
          {channel.description ? <Text style={styles.description}>{channel.description}</Text> : null}
        </View>
        {channel.talker ? <View style={styles.liveDot} /> : null}
        {channel.members.length > 0 ? <Text style={styles.count}>{channel.members.length}</Text> : null}
      </Pressable>

      {/* Who's in the channel, Discord voice-channel style. */}
      {channel.members.map((member) => {
        const talking = member.id === channel.talker;
        return (
          <View key={member.id} style={styles.member}>
            <View style={[styles.avatar, talking && styles.avatarTalking]}>
              <Text style={styles.avatarText}>{member.name.slice(0, 1).toUpperCase()}</Text>
            </View>
            <Text style={[styles.memberName, talking && styles.memberNameTalking]} numberOfLines={1}>
              {member.name}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const AVATAR = 24;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 12, gap: 2 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 8,
    marginTop: 8,
    marginBottom: 6,
  },
  section: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.5, color: colors.textMuted },
  offline: { fontFamily: fonts.medium, fontSize: 12, color: colors.danger },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  rowPressed: { backgroundColor: colors.surfacePressed },
  hash: { fontFamily: fonts.medium, fontSize: 22, color: colors.textMuted, width: 18, textAlign: "center" },
  rowText: { flex: 1 },
  name: { fontFamily: fonts.medium, fontSize: 16, color: colors.text },
  description: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  count: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary, minWidth: 16, textAlign: "right" },
  member: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4, paddingLeft: 38, paddingRight: 10 },
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
  avatarText: { fontFamily: fonts.semibold, fontSize: 11, color: colors.text },
  memberName: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.textMuted },
  memberNameTalking: { color: colors.text },
  spinner: { marginTop: 48 },
  empty: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, textAlign: "center", marginTop: 48 },
});

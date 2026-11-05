import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { useChannels } from "@/hooks/useChannels";
import { SERVER_HTTP_URL } from "@/services/server";
import type { ChannelInfo } from "@walkie/shared";
import { router } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";

export default function Channels() {
  const { channels, loaded, refreshing, error, refresh } = useChannels();

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.content}
      data={channels}
      keyExtractor={(c) => c.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.textMuted} />}
      ListHeaderComponent={<Text style={styles.section}>VOICE CHANNELS</Text>}
      ListEmptyComponent={
        !loaded ? (
          <ActivityIndicator style={styles.spinner} color={colors.textMuted} />
        ) : (
          <Text style={styles.empty}>
            {error ? `Can't reach the server at ${SERVER_HTTP_URL}\n(${error})` : "No channels."}
          </Text>
        )
      }
      renderItem={({ item }) => <ChannelRow channel={item} />}
    />
  );
}

function ChannelRow({ channel }: { channel: ChannelInfo }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => router.push({ pathname: "/channel/[id]", params: { id: channel.id, name: channel.name } })}
    >
      <Text style={styles.hash}>#</Text>
      <View style={styles.rowText}>
        <Text style={styles.name}>{channel.name}</Text>
        {channel.description ? <Text style={styles.description}>{channel.description}</Text> : null}
      </View>
      {channel.busy ? <View style={styles.liveDot} /> : null}
      {channel.memberCount > 0 ? <Text style={styles.count}>{channel.memberCount}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 12, gap: 2 },
  section: {
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 0.5,
    color: colors.textMuted,
    marginHorizontal: 8,
    marginTop: 8,
    marginBottom: 6,
  },
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
  spinner: { marginTop: 48 },
  empty: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, textAlign: "center", marginTop: 48 },
});

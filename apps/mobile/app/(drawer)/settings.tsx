import InfoBox from "@/components/info-box";
import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { SERVER_HTTP_URL } from "@/services/server";
import * as Device from "expo-device";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function Settings() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <InfoBox title="Settings">App settings go here.</InfoBox>

      {/* Dev-only section, stripped from production builds. */}
      {__DEV__ && (
        <View style={styles.devSection}>
          <Text style={styles.devTitle}>Developer</Text>
          <Row label="Device" value={`${Device.manufacturer ?? "?"} ${Device.modelName ?? ""}`} />
          <Row label="OS" value={`${Device.osName} ${Device.osVersion}`} />
          <Row label="Physical device" value={Device.isDevice ? "yes" : "no (simulator)"} />
          <Row label="Server" value={SERVER_HTTP_URL} />
        </View>
      )}
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} selectable>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 20 },
  devSection: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  devTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.accent },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  rowLabel: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  rowValue: { fontFamily: fonts.medium, fontSize: 14, color: colors.text, flexShrink: 1, textAlign: "right" },
});

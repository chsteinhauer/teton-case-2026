import InfoBox from "@/components/info-box";
import { colors } from "@/constants/colors";
import Constants from "expo-constants";
import { ScrollView, StyleSheet } from "react-native";

export default function About() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <InfoBox title={Constants.expoConfig?.name ?? "App"}>
        Version {Constants.expoConfig?.version ?? "unknown"}
      </InfoBox>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 20 },
});

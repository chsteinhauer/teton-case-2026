import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Index() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.hero}>
        <Text style={styles.title}>Walkie Talkie</Text>
        <Text style={styles.subtitle}>Push-to-talk over the local network.</Text>
      </View>

      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={() => router.replace("/home")}
      >
        <Text style={styles.buttonText}>Get started</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  hero: {
    gap: 8,
  },
  title: {
    fontFamily: fonts.semibold,
    fontSize: 32,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.textSecondary,
  },
  button: {
    backgroundColor: colors.backgroundInverse,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonText: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: colors.textInverse,
  },
});

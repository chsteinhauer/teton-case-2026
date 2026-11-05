import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { navigationTheme } from "@/constants/theme";
import { Jost_400Regular } from "@expo-google-fonts/jost/400Regular";
import { Jost_500Medium } from "@expo-google-fonts/jost/500Medium";
import { Jost_600SemiBold } from "@expo-google-fonts/jost/600SemiBold";
import { useFonts } from "expo-font";
import { SplashScreen, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Keep the splash up until fonts are ready, so the first paint isn't in the
// system fallback font.
SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * Root navigator: a Stack.
 *   index         landing screen
 *   (drawer)      the drawer with Channels / Settings / About
 *   channel/[id]  pushed on top of the drawer, with a back button
 */
export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Jost_400Regular, Jost_500Medium, Jost_600SemiBold });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.backgroundDeep }}>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            headerTitleStyle: { fontFamily: fonts.medium, fontSize: 18 },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
          <Stack.Screen name="channel/[id]" options={{ headerBackButtonDisplayMode: "minimal" }} />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

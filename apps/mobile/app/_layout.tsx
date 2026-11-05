import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import { Jost_400Regular } from "@expo-google-fonts/jost/400Regular";
import { Jost_500Medium } from "@expo-google-fonts/jost/500Medium";
import { Jost_600SemiBold } from "@expo-google-fonts/jost/600SemiBold";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useFonts } from "expo-font";
import { SplashScreen } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Keep the splash up until fonts are ready, so the first paint isn't in the
// system fallback font.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Jost_400Regular, Jost_500Medium, Jost_600SemiBold });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  const labelStyle = { fontFamily: fonts.medium, fontSize: 16 };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Drawer
        screenOptions={{
          drawerActiveTintColor: colors.textInverse,
          drawerInactiveTintColor: colors.textInverse,
          drawerActiveBackgroundColor: "#ffffff22",
          drawerStyle: { backgroundColor: colors.backgroundInverse },
          drawerLabelStyle: labelStyle,
          headerTintColor: colors.text,
          headerTitleStyle: { fontFamily: fonts.medium, fontSize: 18 },
          headerShadowVisible: false,
        }}
      >
        {/* Landing screen: no header, hidden from the drawer. */}
        <Drawer.Screen
          name="index"
          options={{
            headerShown: false,
            drawerItemStyle: { display: "none" },
            swipeEnabled: false,
          }}
        />
        <Drawer.Screen
          name="(drawer)/home"
          options={{
            title: "Home",
            drawerIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color as string} />,
          }}
        />
        <Drawer.Screen
          name="(drawer)/settings"
          options={{
            title: "Settings",
            drawerIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color as string} />,
          }}
        />
        <Drawer.Screen
          name="(drawer)/about"
          options={{
            title: "About",
            drawerIcon: ({ color, size }) => (
              <Ionicons name="information-circle-outline" size={size} color={color as string} />
            ),
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}

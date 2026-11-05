import { colors } from "@/constants/colors";
import { fonts } from "@/constants/fonts";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Drawer } from "expo-router/drawer";

export default function DrawerLayout() {
  return (
    <Drawer
      screenOptions={{
        drawerStyle: { backgroundColor: colors.backgroundDeep },
        drawerActiveBackgroundColor: colors.surfaceRaised,
        drawerActiveTintColor: colors.text,
        drawerInactiveTintColor: colors.textMuted,
        drawerLabelStyle: { fontFamily: fonts.medium, fontSize: 16 },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.medium, fontSize: 18 },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Drawer.Screen
        name="home"
        options={{
          title: "Channels",
          drawerIcon: ({ color, size }) => <Ionicons name="chatbubbles-outline" size={size} color={color as string} />,
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          title: "Settings",
          drawerIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color as string} />,
        }}
      />
      <Drawer.Screen
        name="about"
        options={{
          title: "About",
          drawerIcon: ({ color, size }) => (
            <Ionicons name="information-circle-outline" size={size} color={color as string} />
          ),
        }}
      />
    </Drawer>
  );
}

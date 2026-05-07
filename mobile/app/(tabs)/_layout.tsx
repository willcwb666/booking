import { Tabs } from "expo-router";

function HomeIcon({ color }: { color: string }) {
  return null; // Expo Router handles icons via tabBarIcon
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: {
          borderTopColor: "#f3f4f6",
          elevation: 0,
          shadowOpacity: 0,
        },
        headerStyle: { backgroundColor: "#fff" },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "700", color: "#111827" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Início",
          tabBarLabel: "Início",
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Agendamentos",
          tabBarLabel: "Agendamentos",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarLabel: "Perfil",
        }}
      />
    </Tabs>
  );
}

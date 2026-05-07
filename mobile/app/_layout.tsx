import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="booking/[id]" options={{ headerShown: true, title: "Agendamento" }} />
        <Stack.Screen name="company/[slug]" options={{ headerShown: true, title: "Empresa" }} />
        <Stack.Screen name="book/[configId]" options={{ headerShown: true, title: "Agendar" }} />
      </Stack>
    </>
  );
}

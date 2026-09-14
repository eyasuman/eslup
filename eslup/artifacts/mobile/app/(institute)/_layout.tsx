import { Stack } from "expo-router";

export default function InstituteLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="institute-register" />
      <Stack.Screen name="institute-status" />
      <Stack.Screen name="institute-dashboard" />
    </Stack>
  );
}

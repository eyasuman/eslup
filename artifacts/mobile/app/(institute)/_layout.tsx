import { Stack } from "expo-router";

export default function InstituteLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="register" />
    </Stack>
  );
}

import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { DataProvider } from "@/context/DataContext";
import { useColors } from "@/hooks/useColors";

SplashScreen.preventAutoHideAsync().catch(() => {});
const queryClient = new QueryClient();

function RootLayoutNav() {
  return <Stack screenOptions={{ headerShown: false }}>
    <Stack.Screen name="(tabs)" />
    <Stack.Screen name="provider/[id]" options={{ presentation: "modal" }} />
    {["institutes/index", "banners/index", "reviews/index", "patients/index", "audit/index", "settings/index", "teleradiology/index", "licenses/index", "payments/index"].map((name) => <Stack.Screen key={name} name={name as never} options={{ animation: "slide_from_right" }} />)}
  </Stack>;
}

function AccessDenied() {
  const colors = useColors(); const insets = useSafeAreaInsets(); const { signOut } = useAuth();
  return <View style={[styles.center, { backgroundColor: colors.darkNavy, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
    <Text style={[styles.deniedEyebrow, { color: colors.tint }]}>PULSE NETWORK</Text>
    <Text style={[styles.deniedTitle, { color: colors.primaryForeground }]}>Access denied</Text>
    <Text style={[styles.deniedCopy, { color: colors.mutedForeground }]}>This account is authenticated but does not have the administrator role. Contact a system administrator if you believe this is an error.</Text>
    <Pressable testID="admin-sign-out-denied" onPress={() => void signOut()} style={[styles.signOut, { borderColor: colors.border }]}><Text style={[styles.signOutText, { color: colors.primaryForeground }]}>Sign out</Text></Pressable>
  </View>;
}

function AuthGate() {
  const colors = useColors(); const { session, isLoading, isAdmin } = useAuth();
  if (isLoading) return <View style={[styles.center, { backgroundColor: colors.darkNavy }]}><ActivityIndicator size="large" color={colors.tint} /></View>;
  if (!session) return <Stack screenOptions={{ headerShown: false }}><Stack.Screen name="login" /></Stack>;
  if (!isAdmin) return <AccessDenied />;
  return <RootLayoutNav />;
}

function DataBoundary({ children }: { children: React.ReactNode }) {
  const { session, isAdmin } = useAuth();
  return <DataProvider enabled={!!session && isAdmin}>{children}</DataProvider>;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const hiddenRef = useRef(false);
  useEffect(() => { if ((fontsLoaded || fontError) && !hiddenRef.current) { hiddenRef.current = true; SplashScreen.hideAsync().catch(() => {}); } }, [fontsLoaded, fontError]);
  if (!fontsLoaded && !fontError) return null;
  return <SafeAreaProvider><ErrorBoundary><QueryClientProvider client={queryClient}><GestureHandlerRootView style={{ flex: 1 }}><KeyboardProvider><AuthProvider><DataBoundary><AuthGate /></DataBoundary></AuthProvider></KeyboardProvider></GestureHandlerRootView></QueryClientProvider></ErrorBoundary></SafeAreaProvider>;
}
const styles = StyleSheet.create({ center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 }, deniedEyebrow: { fontSize: 11, fontWeight: "700", letterSpacing: 2 }, deniedTitle: { fontSize: 30, fontWeight: "700", marginTop: 14 }, deniedCopy: { fontSize: 15, lineHeight: 23, textAlign: "center", marginTop: 12 }, signOut: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 12, marginTop: 28 }, signOutText: { fontWeight: "700" } });
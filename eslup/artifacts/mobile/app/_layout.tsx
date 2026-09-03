import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Feather } from "@expo/vector-icons";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { I18nManager, Platform, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { IncomingCallModal } from "@/components/IncomingCallModal";
import { LanguageOnboarding } from "@/components/LanguageOnboarding";
import { SplashAnimation } from "@/components/SplashAnimation";
import { AppProvider, useApp, Language } from "@/context/AppContext";
import { getCurrentSession } from "@/lib/supabase";

setBaseUrl(
  process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : null,
);
setAuthTokenGetter(async () => {
  const session = await getCurrentSession().catch(() => null);
  return session?.access_token ?? null;
});

// On web, SplashScreen is a no-op but must still be "hidden" explicitly
if (Platform.OS !== "web") {
  SplashScreen.preventAutoHideAsync();
}

const queryClient = new QueryClient();

function AppShell() {
  const { language, setLanguage, userRole, user, hasPickedLanguage, isSessionLoading } = useApp();
  const isRTL = language === "ar";

  useEffect(() => {
    I18nManager.allowRTL(isRTL);
  }, [isRTL]);

  // Show language onboarding on first visit (after session has restored)
  if (!isSessionLoading && hasPickedLanguage === false) {
    return (
      <LanguageOnboarding
        onSelect={(lang: Language) => setLanguage(lang)}
      />
    );
  }

  return (
    <View style={{ flex: 1, direction: isRTL ? "rtl" : "ltr" }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(provider)" options={{ headerShown: false }} />
        <Stack.Screen name="(institute)" options={{ headerShown: false }} />
        <Stack.Screen name="urgent-care" options={{ headerShown: false }} />
        <Stack.Screen name="service" options={{ headerShown: false }} />
        <Stack.Screen name="specialist-list" options={{ headerShown: false }} />
        <Stack.Screen name="provider-detail" options={{ headerShown: false }} />
        <Stack.Screen name="edd-calculator" options={{ headerShown: false }} />
        <Stack.Screen name="booking" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="video-consultation" options={{ headerShown: false }} />
        <Stack.Screen name="appointments" options={{ headerShown: false }} />
      </Stack>

      {userRole === "provider" && user?.id && (
        <IncomingCallModal doctorUserId={user.id} doctorName={user.name} />
      )}
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    // Explicitly load vector icon font so icons render on web & standalone builds
    ...Feather.font,
  });
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    if (Platform.OS === "web") return;
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // On web, always render immediately — fonts load asynchronously without blocking
  // On native, wait for fonts so we don't flash unstyled text
  if (Platform.OS !== "web" && !fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <AppProvider>
              <AppShell />
            </AppProvider>
            {!splashDone && (
              <SplashAnimation onFinish={() => setSplashDone(true)} />
            )}
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

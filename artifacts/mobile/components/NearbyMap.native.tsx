// Native map backed by Leaflet/OpenStreetMap in WebView. This avoids platform map
// provider keys while retaining a fully pan/zoom capable map on iOS and Android.
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import {
  getMapLocationKey,
  isMapLocationAvailable,
  isValidLocationCoordinates,
  type MapLocation,
} from "@/lib/mapLocations";
import { createLeafletMapHtml, type LeafletMapLocation } from "@/lib/leafletMapHtml";

interface Props {
  locations: MapLocation[];
  selectedLocationKey?: string;
  isDark: boolean;
  textPrimary: string;
  textMuted: string;
  cardBg: string;
  cardBorder: string;
}

function openLocation(location: MapLocation) {
  if (location.kind === "institute") {
    router.push({ pathname: "/institute/[id]" as any, params: { id: location.id } });
    return;
  }
  router.push({ pathname: "/provider-detail" as any, params: { doctorId: location.id, doctorName: location.name } });
}

export default function NearbyMap({ locations, selectedLocationKey, isDark, textPrimary, textMuted, cardBg, cardBorder }: Props) {
  const webViewRef = useRef<WebView>(null);
  const validLocations = useMemo<LeafletMapLocation[]>(
    () => locations
      .filter((location) => isValidLocationCoordinates(location.lat, location.lng))
      .map((location) => ({ ...location, available: isMapLocationAvailable(location), lat: Number(location.lat), lng: Number(location.lng) })),
    [locations]
  );
  const unavailableCount = locations.length - validLocations.length;
  const [selected, setSelected] = useState<MapLocation | null>(null);
  const html = useMemo(() => createLeafletMapHtml(validLocations, selectedLocationKey, isDark, "native"), [validLocations, selectedLocationKey, isDark]);

  useEffect(() => {
    setSelected(selectedLocationKey ? validLocations.find((item) => getMapLocationKey(item) === selectedLocationKey) ?? null : null);
  }, [selectedLocationKey, validLocations]);

  if (!validLocations.length) {
    return <View style={styles.unavailableState}><Feather name="map-pin" size={30} color={textMuted} /><Text style={[styles.unavailableTitle, { color: textPrimary }]}>Location unavailable</Text><Text style={[styles.unavailableText, { color: textMuted }]}>This provider or institute has not added valid map coordinates yet.</Text></View>;
  }

  const chooseByKey = (key: string, open = false) => {
    const location = validLocations.find((item) => getMapLocationKey(item) === key);
    if (!location) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(location);
    if (open) openLocation(location);
  };

  return <View style={styles.wrapper}>
    <WebView ref={webViewRef} source={{ html }} originWhitelist={["*"]} javaScriptEnabled domStorageEnabled onMessage={(event) => {
      try { const message = JSON.parse(event.nativeEvent.data); if (message?.type === "select" || message?.type === "open") chooseByKey(message.key, message.type === "open"); } catch { /* Ignore malformed WebView messages. */ }
    }} style={styles.map} />
    {selected && <Pressable onPress={() => openLocation(selected)} style={[styles.infoCard, { backgroundColor: cardBg, borderColor: cardBorder }]}><View style={{ flex: 1, gap: 3 }}><Text style={[styles.infoName, { color: textPrimary }]}>{selected.name}</Text><Text style={styles.infoSpec}>{selected.subtitle ?? (selected.kind === "institute" ? "Health Institute" : "Provider")}</Text><Text style={[styles.coordinate, { color: textMuted }]}>{Number(selected.lat).toFixed(5)}, {Number(selected.lng).toFixed(5)}</Text></View><View style={styles.goBtn}><Feather name="arrow-right" size={18} color="#fff" /></View></Pressable>}
    {unavailableCount > 0 && <View style={[styles.unavailableBanner, { backgroundColor: cardBg, borderColor: cardBorder }]}><Text style={[styles.bannerText, { color: textMuted }]}>{unavailableCount} location{unavailableCount === 1 ? "" : "s"} hidden because coordinates are unavailable</Text></View>}
  </View>;
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, overflow: "hidden" },
  map: { flex: 1 },
  infoCard: { position: "absolute", bottom: 16, left: 16, right: 16, flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, shadowOpacity: 0.12, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12 },
  infoName: { fontSize: 14, fontFamily: "Inter_700Bold" }, infoSpec: { fontSize: 12, color: "#315d93", fontFamily: "Inter_500Medium" }, coordinate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  goBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#315d93", alignItems: "center", justifyContent: "center" },
  unavailableState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, backgroundColor: "#EEF3FA" }, unavailableTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginTop: 14 }, unavailableText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, textAlign: "center", marginTop: 6 },
  unavailableBanner: { position: "absolute", top: 12, left: 12, right: 12, alignItems: "center", borderWidth: 1, borderRadius: 10, padding: 7 }, bannerText: { fontSize: 10, fontFamily: "Inter_400Regular" },
});
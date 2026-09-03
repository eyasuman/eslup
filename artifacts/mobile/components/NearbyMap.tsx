// Web implementation: Leaflet/OpenStreetMap runs in an isolated iframe.
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
  const iframeRef = useRef<any>(null);
  const validLocations = useMemo<LeafletMapLocation[]>(
    () => locations.filter((location) => isValidLocationCoordinates(location.lat, location.lng)).map((location) => ({
      ...location,
      available: isMapLocationAvailable(location),
      lat: Number(location.lat),
      lng: Number(location.lng),
    })),
    [locations]
  );
  const [selected, setSelected] = useState<MapLocation | null>(null);
  const unavailableCount = locations.length - validLocations.length;
  const srcDoc = useMemo(
    () => createLeafletMapHtml(validLocations, selectedLocationKey, isDark, "web"),
    [validLocations, selectedLocationKey, isDark]
  );

  const chooseByKey = (key: string, open = false) => {
    const location = validLocations.find((item) => getMapLocationKey(item) === key);
    if (!location) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(location);
    if (open) openLocation(location);
  };

  useEffect(() => {
    setSelected(selectedLocationKey ? validLocations.find((item) => getMapLocationKey(item) === selectedLocationKey) ?? null : null);
  }, [selectedLocationKey, validLocations]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow || event.data?.source !== "pulse-leaflet") return;
      const message = event.data.message;
      if ((message?.type === "select" || message?.type === "open") && typeof message.key === "string") {
        chooseByKey(message.key, message.type === "open");
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [validLocations]);

  if (!validLocations.length) {
    return <View style={styles.unavailableState}><Feather name="map-pin" size={30} color={textMuted} /><Text style={[styles.unavailableTitle, { color: textPrimary }]}>Location unavailable</Text><Text style={[styles.unavailableText, { color: textMuted }]}>This provider or institute has not added valid map coordinates yet.</Text></View>;
  }

  return <View style={[styles.wrapper, { backgroundColor: isDark ? "#0D1520" : "#EEF3FA" }]}>
    <View style={styles.map}>{React.createElement("iframe" as any, { ref: iframeRef, srcDoc, title: "Nearby healthcare locations", style: { border: 0, width: "100%", height: "100%" } })}</View>
    {selected && <Pressable onPress={() => openLocation(selected)} style={[styles.callout, { backgroundColor: cardBg, borderColor: cardBorder }]}><View style={{ flex: 1, gap: 3 }}><Text style={[styles.calloutName, { color: textPrimary }]}>{selected.name}</Text><Text style={styles.calloutSpec}>{selected.subtitle ?? (selected.kind === "institute" ? "Health Institute" : "Provider")}</Text><Text style={[styles.coordinate, { color: textMuted }]}>{Number(selected.lat).toFixed(5)}, {Number(selected.lng).toFixed(5)}</Text></View><View style={styles.goBtn}><Feather name="arrow-right" size={16} color="#fff" /></View></Pressable>}
    {unavailableCount > 0 && <Text style={[styles.unavailableCount, { color: textMuted }]}>{unavailableCount} location{unavailableCount === 1 ? "" : "s"} hidden because coordinates are unavailable</Text>}
  </View>;
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, marginHorizontal: 12, marginBottom: 12, borderRadius: 20, overflow: "hidden", minHeight: 420 },
  map: { flex: 1, minHeight: 300 },
  callout: { flexDirection: "row", alignItems: "center", gap: 12, margin: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  calloutName: { fontSize: 14, fontFamily: "Inter_700Bold" }, calloutSpec: { fontSize: 12, color: "#315d93", fontFamily: "Inter_500Medium" }, coordinate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  goBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#315d93", alignItems: "center", justifyContent: "center" },
  unavailableState: { flex: 1, minHeight: 320, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }, unavailableTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 14 }, unavailableText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, textAlign: "center", marginTop: 6 },
  unavailableCount: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 12, paddingBottom: 8 },
});
// Web fallback — real MapView is in NearbyMap.native.tsx
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  getMapLocationKey,
  isMapLocationAvailable,
  isValidLocationCoordinates,
  type MapLocation,
} from "@/lib/mapLocations";

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
  router.push({
    pathname: "/provider-detail" as any,
    params: { doctorId: location.id, doctorName: location.name },
  });
}

export default function NearbyMap({
  locations,
  selectedLocationKey,
  isDark,
  textPrimary,
  textMuted,
  cardBg,
  cardBorder,
}: Props) {
  const validLocations = useMemo(
    () => locations.filter((location) => isValidLocationCoordinates(location.lat, location.lng)),
    [locations]
  );
  const unavailableCount = locations.length - validLocations.length;
  const [selected, setSelected] = useState<MapLocation | null>(null);

  useEffect(() => {
    if (!selectedLocationKey) return;
    setSelected(validLocations.find((location) => getMapLocationKey(location) === selectedLocationKey) ?? null);
  }, [selectedLocationKey, validLocations]);

  const bounds = useMemo(() => {
    if (!validLocations.length) return null;
    const lats = validLocations.map((location) => location.lat as number);
    const lngs = validLocations.map((location) => location.lng as number);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      minLat,
      maxLat,
      minLng,
      maxLng,
      latSpan: Math.max(maxLat - minLat, 0.02),
      lngSpan: Math.max(maxLng - minLng, 0.02),
    };
  }, [validLocations]);

  const pinPosition = (location: MapLocation) => {
    if (!bounds) return { top: "50%", left: "50%" };
    const latPadding = (bounds.latSpan - (bounds.maxLat - bounds.minLat)) / 2;
    const lngPadding = (bounds.lngSpan - (bounds.maxLng - bounds.minLng)) / 2;
    const top = 10 + 80 * ((bounds.maxLat + latPadding - (location.lat as number)) / bounds.latSpan);
    const left = 10 + 80 * (((location.lng as number) - bounds.minLng + lngPadding) / bounds.lngSpan);
    return { top: `${top}%`, left: `${left}%` };
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: isDark ? "#0D1520" : "#EEF3FA" }]}>
      <View style={[styles.mapHeader, { backgroundColor: isDark ? "rgba(49,93,147,0.35)" : "rgba(49,93,147,0.12)" }]}>
        <Feather name="map-pin" size={14} color="#315d93" />
        <Text style={[styles.mapHeaderText, { color: "#315d93" }]}>
          {validLocations.length} mapped location{validLocations.length === 1 ? "" : "s"}
        </Text>
        <View style={styles.legendRow}>
          <Feather name="user" size={10} color="#059669" />
          <Text style={[styles.legendText, { color: textMuted }]}>Provider</Text>
          <Feather name="home" size={10} color="#D97706" />
          <Text style={[styles.legendText, { color: textMuted }]}>Institute</Text>
        </View>
      </View>

      {validLocations.length === 0 ? (
        <View style={styles.unavailableState}>
          <View style={[styles.unavailableIcon, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0" }]}>
            <Feather name="map-pin" size={28} color={textMuted} />
          </View>
          <Text style={[styles.unavailableTitle, { color: textPrimary }]}>Location unavailable</Text>
          <Text style={[styles.unavailableText, { color: textMuted }]}>
            This provider or institute has not added valid map coordinates yet.
          </Text>
        </View>
      ) : (
        <View style={styles.mapBody}>
          {[20, 40, 60, 80].map((p) => (
            <View
              key={`h${p}`}
              style={[
                styles.gridLineH,
                { top: `${p}%` as any, backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(49,93,147,0.06)" },
              ]}
            />
          ))}
          {[25, 50, 75].map((p) => (
            <View
              key={`v${p}`}
              style={[
                styles.gridLineV,
                { left: `${p}%` as any, backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(49,93,147,0.06)" },
              ]}
            />
          ))}

          {validLocations.map((location) => {
            const locationKey = getMapLocationKey(location);
            const isSelected = selected ? getMapLocationKey(selected) === locationKey : false;
            const position = pinPosition(location);
            const pinColor = location.kind === "institute"
              ? "#D97706"
              : isMapLocationAvailable(location) ? "#059669" : "#64748B";
            return (
              <Pressable
                key={locationKey}
                accessibilityLabel={`${location.name} map marker`}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelected(location);
                }}
                style={[
                  styles.pin,
                  {
                    top: position.top as any,
                    left: position.left as any,
                    backgroundColor: pinColor,
                    transform: [{ translateX: -21 }, { translateY: -21 }, { scale: isSelected ? 1.3 : 1 }],
                  },
                ]}
              >
                <Feather name={location.kind === "institute" ? "home" : "user"} size={13} color="#fff" />
                {isSelected && <View style={[styles.pinPulse, { borderColor: pinColor }]} />}
              </Pressable>
            );
          })}
        </View>
      )}

      {selected && (
        <Pressable
          onPress={() => openLocation(selected)}
          style={[styles.callout, { backgroundColor: cardBg, borderColor: cardBorder }]}
        >
          <View style={[styles.calloutAvatar, { backgroundColor: (selected.kind === "institute" ? "#D97706" : "#315d93") + "20" }]}>
            <Feather name={selected.kind === "institute" ? "home" : "user"} size={20} color={selected.kind === "institute" ? "#D97706" : "#315d93"} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.calloutName, { color: textPrimary }]}>{selected.name}</Text>
            <Text style={[styles.calloutSpec, { color: selected.kind === "institute" ? "#D97706" : "#315d93" }]}>
              {selected.subtitle ?? (selected.kind === "institute" ? "Health Institute" : "Healthcare Provider")}
            </Text>
            <View style={styles.calloutMeta}>
              {selected.rating && (
                <>
                  <Feather name="star" size={11} color="#D97706" />
                  <Text style={[styles.calloutRating, { color: textPrimary }]}>{selected.rating}</Text>
                </>
              )}
              <Feather name="navigation" size={11} color={textMuted} />
              <Text style={{ color: textMuted, fontSize: 10, fontFamily: "Inter_500Medium" }}>
                {(selected.lat as number).toFixed(5)}, {(selected.lng as number).toFixed(5)}
              </Text>
            </View>
          </View>
          <View style={styles.goBtn}>
            <Feather name="arrow-right" size={16} color="#fff" />
          </View>
        </Pressable>
      )}

      {!selected && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.nearbyScroll}
          contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingVertical: 10 }}
        >
          {validLocations.slice(0, 8).map((location) => {
            const available = isMapLocationAvailable(location);
            return (
              <Pressable
                key={getMapLocationKey(location)}
                onPress={() => setSelected(location)}
                style={[styles.nearbyCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
              >
                <View
                  style={[
                    styles.nearbyAvatar,
                    { backgroundColor: location.kind === "institute" ? "#D97706" + "20" : available ? "#059669" + "20" : "#64748B" + "15" },
                  ]}
                >
                  <Feather
                    name={location.kind === "institute" ? "home" : "user"}
                    size={18}
                    color={location.kind === "institute" ? "#D97706" : available ? "#059669" : "#64748B"}
                  />
                </View>
                <Text style={[styles.nearbyName, { color: textPrimary }]} numberOfLines={1}>
                  {location.name}
                </Text>
                <Text style={[styles.nearbySpec, { color: location.kind === "institute" ? "#D97706" : "#315d93" }]} numberOfLines={1}>
                  {location.kind === "institute" ? "Institute" : "Provider"}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      {unavailableCount > 0 && validLocations.length > 0 && (
        <Text style={[styles.unavailableCount, { color: textMuted }]}>
          {unavailableCount} location{unavailableCount === 1 ? "" : "s"} hidden because coordinates are unavailable
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, marginHorizontal: 12, marginBottom: 12, borderRadius: 20, overflow: "hidden", minHeight: 420 },
  mapHeader: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10 },
  mapHeaderText: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  mapBody: { flex: 1, position: "relative", minHeight: 260 },
  gridLineH: { position: "absolute", left: 0, right: 0, height: 1 },
  gridLineV: { position: "absolute", top: 0, bottom: 0, width: 1 },
  pin: { position: "absolute", width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", shadowOpacity: 0.5, shadowOffset: { width: 0, height: 4 }, shadowRadius: 6, elevation: 6 },
  pinPulse: { position: "absolute", width: 52, height: 52, borderRadius: 26, borderWidth: 2, opacity: 0.5 },
  callout: { flexDirection: "row", alignItems: "center", gap: 12, margin: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  calloutAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  calloutName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  calloutSpec: { fontSize: 12, fontFamily: "Inter_500Medium" },
  calloutMeta: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  calloutRating: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  goBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#315d93", alignItems: "center", justifyContent: "center" },
  nearbyScroll: { maxHeight: 110 },
  nearbyCard: { width: 80, alignItems: "center", padding: 10, gap: 4, borderRadius: 12, borderWidth: 1 },
  nearbyAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  nearbyName: { fontSize: 11, fontFamily: "Inter_600SemiBold", textAlign: "center", width: "100%" },
  nearbySpec: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  unavailableState: { flex: 1, minHeight: 320, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  unavailableIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  unavailableTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 14 },
  unavailableText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, textAlign: "center", marginTop: 6 },
  unavailableCount: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 12, paddingBottom: 8 },
});

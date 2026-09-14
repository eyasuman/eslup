// Native version — uses real react-native-maps MapView
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { StyleSheet, Text, Pressable, View } from "react-native";
import MapView, { Marker, Callout } from "react-native-maps";
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
  textPrimary,
  textMuted,
  cardBg,
  cardBorder,
}: Props) {
  const mapRef = useRef<MapView>(null);
  const validLocations = useMemo(
    () => locations.filter((location) => isValidLocationCoordinates(location.lat, location.lng)),
    [locations]
  );
  const unavailableCount = locations.length - validLocations.length;
  const [selected, setSelected] = useState<MapLocation | null>(null);

  useEffect(() => {
    const nextSelected = selectedLocationKey
      ? validLocations.find((location) => getMapLocationKey(location) === selectedLocationKey) ?? null
      : null;
    setSelected(nextSelected);
    const timer = setTimeout(() => {
      if (nextSelected) {
        mapRef.current?.animateToRegion({
          latitude: nextSelected.lat as number,
          longitude: nextSelected.lng as number,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }, 350);
      } else if (validLocations.length > 0) {
        mapRef.current?.fitToCoordinates(
          validLocations.map((location) => ({
            latitude: location.lat as number,
            longitude: location.lng as number,
          })),
          { edgePadding: { top: 56, right: 56, bottom: 140, left: 56 }, animated: true }
        );
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedLocationKey, validLocations]);

  if (validLocations.length === 0) {
    return (
      <View style={styles.unavailableState}>
        <View style={styles.unavailableIcon}>
          <Feather name="map-pin" size={30} color={textMuted} />
        </View>
        <Text style={[styles.unavailableTitle, { color: textPrimary }]}>Location unavailable</Text>
        <Text style={[styles.unavailableText, { color: textMuted }]}>
          This provider or institute has not added valid map coordinates yet.
        </Text>
      </View>
    );
  }

  const initialLocation = selectedLocationKey
    ? validLocations.find((location) => getMapLocationKey(location) === selectedLocationKey)
    : validLocations[0];

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={{
          latitude: initialLocation?.lat as number,
          longitude: initialLocation?.lng as number,
          latitudeDelta: 0.06,
          longitudeDelta: 0.06,
        }}
        showsUserLocation
        showsMyLocationButton
        mapType="standard"
      >
        {validLocations.map((location) => {
          const available = isMapLocationAvailable(location);
          const markerColor = location.kind === "institute" ? "#D97706" : available ? "#059669" : "#64748B";
          return (
            <Marker
              key={getMapLocationKey(location)}
              coordinate={{ latitude: location.lat as number, longitude: location.lng as number }}
              title={location.name}
              description={`${location.subtitle ?? (location.kind === "institute" ? "Health Institute" : "Provider")} · ${location.city ?? "Location"}`}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelected(location); }}
            >
              <View style={[styles.markerPin, { backgroundColor: markerColor }]}>
                <Feather name={location.kind === "institute" ? "home" : "user"} size={12} color="#fff" />
              </View>
              <Callout
                onPress={() => openLocation(location)}
              >
                <View style={styles.callout}>
                  <Text style={styles.calloutName}>{location.name}</Text>
                  <Text style={styles.calloutSpec}>
                    {location.subtitle ?? (location.kind === "institute" ? "Health Institute" : "Healthcare Provider")}
                  </Text>
                  <Text style={styles.calloutHosp}>{location.city ?? "Location available"}</Text>
                  <Text style={styles.calloutAction}>Tap to view profile →</Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {selected && (
        <Pressable
          onPress={() => openLocation(selected)}
          style={[styles.infoCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
        >
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={[styles.infoName, { color: textPrimary }]}>{selected.name}</Text>
            <Text style={[styles.infoSpec, { color: "#315d93" }]}>
              {selected.subtitle ?? (selected.kind === "institute" ? "Health Institute" : "Provider")}
            </Text>
            <View style={styles.infoMeta}>
              {selected.rating && (
                <>
                  <Feather name="star" size={12} color="#D97706" />
                  <Text style={{ color: textPrimary, fontSize: 12, fontFamily: "Inter_600SemiBold" }}>
                    {selected.rating}
                  </Text>
                </>
              )}
              <Text style={{ color: textMuted, fontSize: 11, fontFamily: "Inter_400Regular" }}>
                {(selected.lat as number).toFixed(5)}, {(selected.lng as number).toFixed(5)}
              </Text>
            </View>
          </View>
          <View style={styles.goBtn}>
            <Feather name="arrow-right" size={18} color="#fff" />
          </View>
        </Pressable>
      )}
      {unavailableCount > 0 && (
        <View style={[styles.unavailableBanner, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Feather name="info" size={12} color={textMuted} />
          <Text style={{ color: textMuted, fontSize: 10, fontFamily: "Inter_400Regular" }}>
            {unavailableCount} location{unavailableCount === 1 ? "" : "s"} hidden because coordinates are unavailable
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  markerPin: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  callout: { width: 200, padding: 8, gap: 3 },
  calloutName: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#202937" },
  calloutSpec: { fontSize: 12, color: "#315d93", fontFamily: "Inter_500Medium" },
  calloutHosp: { fontSize: 11, color: "#64748B", fontFamily: "Inter_400Regular" },
  calloutAction: { fontSize: 11, color: "#315d93", marginTop: 4, fontFamily: "Inter_500Medium" },
  infoCard: { position: "absolute", bottom: 16, left: 16, right: 16, flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, shadowOpacity: 0.12, shadowOffset: { width: 0, height: 4 }, shadowRadius: 12 },
  infoName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  infoSpec: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
  infoMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  goBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#315d93", alignItems: "center", justifyContent: "center" },
  unavailableState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, backgroundColor: "#EEF3FA" },
  unavailableIcon: { width: 68, height: 68, borderRadius: 34, backgroundColor: "#E2E8F0", alignItems: "center", justifyContent: "center" },
  unavailableTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginTop: 14 },
  unavailableText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, textAlign: "center", marginTop: 6 },
  unavailableBanner: { position: "absolute", top: 12, left: 12, right: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderRadius: 10, padding: 7 },
});

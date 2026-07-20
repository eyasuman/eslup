// Native version — uses real react-native-maps MapView
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import { Feather } from "@expo/vector-icons";
import { StyleSheet, Text, Pressable, View } from "react-native";
import MapView, { Marker, Callout } from "react-native-maps";

interface AnyDoc {
  id?: string;
  userId?: string;
  name: string;
  specialty?: string;
  hospital?: string;
  city?: string;
  rating?: number;
  price?: number;
  consultationFee?: number;
  available?: boolean;
  lat?: number;
  lng?: number;
  serviceModes?: { video?: boolean; audio?: boolean; inPerson?: boolean; homeVisit?: boolean };
  availability?: any[];
}

interface Props {
  docs: AnyDoc[];
  isDark: boolean;
  textPrimary: string;
  textMuted: string;
  cardBg: string;
  cardBorder: string;
}

const ADDIS_CENTER = {
  latitude: 9.0245,
  longitude: 38.7468,
  latitudeDelta: 0.09,
  longitudeDelta: 0.09,
};

// Generate a pseudo-location around Addis for doctors who don't have real coordinates
function pseudoCoord(index: number) {
  const offsets = [
    [0.01, -0.02], [-0.02, 0.03], [0.03, 0.01], [-0.01, -0.03], [0.02, 0.02],
    [-0.03, -0.01], [0.0, 0.04], [0.04, -0.01], [-0.015, 0.025], [0.025, -0.025],
  ];
  const [latOff, lngOff] = offsets[index % offsets.length];
  return { latitude: ADDIS_CENTER.latitude + latOff, longitude: ADDIS_CENTER.longitude + lngOff };
}

function getDocId(doc: AnyDoc): string {
  return doc.userId ?? doc.id ?? "";
}

function isDocAvailable(doc: AnyDoc): boolean {
  if (doc.available === true) return true;
  if (doc.serviceModes?.inPerson || doc.serviceModes?.video) return true;
  if (doc.availability && doc.availability.length > 0) return true;
  return false;
}

export default function NearbyMap({ docs, isDark, textPrimary, textMuted, cardBg, cardBorder }: Props) {
  const [selected, setSelected] = useState<AnyDoc | null>(null);

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={ADDIS_CENTER}
        showsUserLocation
        showsMyLocationButton
        mapType="standard"
      >
        {docs.map((doc, i) => {
          const coord = (doc.lat && doc.lng)
            ? { latitude: doc.lat, longitude: doc.lng }
            : pseudoCoord(i);
          const available = isDocAvailable(doc);
          return (
            <Marker
              key={getDocId(doc) || i}
              coordinate={coord}
              title={doc.name}
              description={`${doc.specialty ?? "Provider"} · ${doc.hospital ?? doc.city ?? "Addis Ababa"}`}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelected(doc); }}
            >
              <View style={[styles.markerPin, { backgroundColor: available ? "#059669" : "#64748B" }]}>
                <Feather name="user" size={12} color="#fff" />
              </View>
              <Callout
                onPress={() =>
                  router.push({
                    pathname: "/provider-detail" as any,
                    params: { doctorId: getDocId(doc), doctorName: doc.name },
                  })
                }
              >
                <View style={styles.callout}>
                  <Text style={styles.calloutName}>{doc.name}</Text>
                  <Text style={styles.calloutSpec}>{doc.specialty ?? "Healthcare Provider"}</Text>
                  <Text style={styles.calloutHosp}>{doc.hospital ?? doc.city ?? "Addis Ababa"}</Text>
                  <Text style={styles.calloutAction}>Tap to view profile →</Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {selected && (
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/provider-detail" as any,
              params: { doctorId: getDocId(selected), doctorName: selected.name },
            })
          }
          style={[styles.infoCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
        >
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={[styles.infoName, { color: textPrimary }]}>{selected.name}</Text>
            <Text style={[styles.infoSpec, { color: "#315d93" }]}>
              {selected.specialty ?? "Provider"} · {selected.hospital ?? selected.city ?? "Addis Ababa"}
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
                ETB {selected.consultationFee ?? (selected.price ? (selected.price / 100).toFixed(0) : "—")}
              </Text>
            </View>
          </View>
          <View style={styles.goBtn}>
            <Feather name="arrow-right" size={18} color="#fff" />
          </View>
        </Pressable>
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
});

// Web fallback — real MapView is in NearbyMap.native.tsx
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

interface AnyDoc {
  id?: string;
  userId?: string;
  name: string;
  specialty?: string;
  hospital?: string;
  city?: string;
  rating?: number;
  available?: boolean;
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

// Predefined pseudo-locations for each doctor pin on the map grid
const PIN_POSITIONS = [
  { top: "12%", left: "20%" }, { top: "8%", left: "55%" },
  { top: "25%", left: "72%" }, { top: "18%", left: "38%" },
  { top: "40%", left: "15%" }, { top: "38%", left: "48%" },
  { top: "52%", left: "68%" }, { top: "55%", left: "30%" },
  { top: "68%", left: "55%" }, { top: "65%", left: "80%" },
];

function isDocAvailable(doc: AnyDoc): boolean {
  if (doc.available === true) return true;
  if (doc.serviceModes?.inPerson || doc.serviceModes?.video) return true;
  if (doc.availability && doc.availability.length > 0) return true;
  return false;
}

function getDocId(doc: AnyDoc): string {
  return doc.userId ?? doc.id ?? "";
}

export default function NearbyMap({ docs, isDark, textPrimary, textMuted, cardBg, cardBorder }: Props) {
  const [selected, setSelected] = useState<AnyDoc | null>(null);

  return (
    <View style={[styles.wrapper, { backgroundColor: isDark ? "#0D1520" : "#EEF3FA" }]}>
      {/* Map header */}
      <View style={[styles.mapHeader, { backgroundColor: isDark ? "rgba(49,93,147,0.35)" : "rgba(49,93,147,0.12)" }]}>
        <Feather name="map-pin" size={14} color="#315d93" />
        <Text style={[styles.mapHeaderText, { color: "#315d93" }]}>
          Addis Ababa · {docs.length} providers
        </Text>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: "#059669" }]} />
          <Text style={[styles.legendText, { color: textMuted }]}>Available</Text>
          <View style={[styles.legendDot, { backgroundColor: "#64748B" }]} />
          <Text style={[styles.legendText, { color: textMuted }]}>Busy</Text>
        </View>
      </View>

      {/* Map body — fills all available space */}
      <View style={styles.mapBody}>
        {/* Grid lines for map feel */}
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

        {/* Center marker for Addis Ababa */}
        <View style={[styles.cityMarker, { borderColor: "#315d93" }]}>
          <Text style={styles.cityMarkerText}>Addis</Text>
        </View>

        {/* Doctor pins */}
        {docs.slice(0, 10).map((doc, i) => {
          const pos = PIN_POSITIONS[i % PIN_POSITIONS.length];
          const docId = getDocId(doc);
          const available = isDocAvailable(doc);
          const isSelected = selected && getDocId(selected) === docId;
          return (
            <Pressable
              key={docId || i}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelected(isSelected ? null : doc);
              }}
              style={[
                styles.pin,
                {
                  top: pos.top as any,
                  left: pos.left as any,
                  backgroundColor: available ? "#059669" : "#64748B",
                  transform: [{ scale: isSelected ? 1.3 : 1 }],
                },
              ]}
            >
              <Feather name="user" size={13} color="#fff" />
              {isSelected && <View style={styles.pinPulse} />}
            </Pressable>
          );
        })}
      </View>

      {/* Selected doctor callout */}
      {selected && (
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/provider-detail" as any,
              params: { doctorId: getDocId(selected), doctorName: selected.name },
            })
          }
          style={[styles.callout, { backgroundColor: cardBg, borderColor: cardBorder }]}
        >
          <View style={[styles.calloutAvatar, { backgroundColor: "#315d93" + "20" }]}>
            <Feather name="user" size={20} color="#315d93" />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.calloutName, { color: textPrimary }]}>{selected.name}</Text>
            <Text style={[styles.calloutSpec, { color: "#315d93" }]}>
              {selected.specialty ?? "Healthcare Provider"}
            </Text>
            <View style={styles.calloutMeta}>
              {selected.rating && (
                <>
                  <Feather name="star" size={11} color="#D97706" />
                  <Text style={[styles.calloutRating, { color: textPrimary }]}>{selected.rating}</Text>
                </>
              )}
              <View style={[styles.availDot, { backgroundColor: isDocAvailable(selected) ? "#059669" : "#64748B" }]} />
              <Text
                style={{ color: isDocAvailable(selected) ? "#059669" : "#64748B", fontSize: 11, fontFamily: "Inter_500Medium" }}
              >
                {isDocAvailable(selected) ? "Available" : "Busy"}
              </Text>
            </View>
          </View>
          <View style={styles.goBtn}>
            <Feather name="arrow-right" size={16} color="#fff" />
          </View>
        </Pressable>
      )}

      {/* Scroll list of nearby providers at the bottom */}
      {!selected && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.nearbyScroll}
          contentContainerStyle={{ gap: 10, paddingHorizontal: 16, paddingVertical: 10 }}
        >
          {docs.slice(0, 8).map((doc, i) => {
            const docId = getDocId(doc);
            const available = isDocAvailable(doc);
            return (
              <Pressable
                key={docId || i}
                onPress={() =>
                  router.push({
                    pathname: "/provider-detail" as any,
                    params: { doctorId: docId, doctorName: doc.name },
                  })
                }
                style={[styles.nearbyCard, { backgroundColor: cardBg, borderColor: cardBorder }]}
              >
                <View
                  style={[
                    styles.nearbyAvatar,
                    { backgroundColor: available ? "#059669" + "20" : "#64748B" + "15" },
                  ]}
                >
                  <Feather name="user" size={18} color={available ? "#059669" : "#64748B"} />
                </View>
                <Text style={[styles.nearbyName, { color: textPrimary }]} numberOfLines={1}>
                  {doc.name.split(" ").slice(-1)[0]}
                </Text>
                <Text style={[styles.nearbySpec, { color: "#315d93" }]} numberOfLines={1}>
                  {(doc.specialty ?? "Provider").split(" ")[0]}
                </Text>
                <View style={[styles.nearbyDot, { backgroundColor: available ? "#059669" : "#64748B" }]} />
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, marginHorizontal: 12, marginBottom: 12, borderRadius: 20, overflow: "hidden", minHeight: 420 },
  mapHeader: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10 },
  mapHeaderText: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  mapBody: { flex: 1, position: "relative", minHeight: 260 },
  gridLineH: { position: "absolute", left: 0, right: 0, height: 1 },
  gridLineV: { position: "absolute", top: 0, bottom: 0, width: 1 },
  cityMarker: { position: "absolute", top: "47%", left: "45%", width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(49,93,147,0.15)" },
  cityMarkerText: { fontSize: 8, fontFamily: "Inter_700Bold", color: "#315d93" },
  pin: { position: "absolute", width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", shadowOpacity: 0.5, shadowOffset: { width: 0, height: 4 }, shadowRadius: 6, elevation: 6 },
  pinPulse: { position: "absolute", width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: "#059669", opacity: 0.5 },
  callout: { flexDirection: "row", alignItems: "center", gap: 12, margin: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  calloutAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  calloutName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  calloutSpec: { fontSize: 12, fontFamily: "Inter_500Medium" },
  calloutMeta: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  calloutRating: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  availDot: { width: 7, height: 7, borderRadius: 3.5 },
  goBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#315d93", alignItems: "center", justifyContent: "center" },
  nearbyScroll: { maxHeight: 110 },
  nearbyCard: { width: 80, alignItems: "center", padding: 10, gap: 4, borderRadius: 12, borderWidth: 1 },
  nearbyAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  nearbyName: { fontSize: 11, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  nearbySpec: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  nearbyDot: { width: 6, height: 6, borderRadius: 3 },
});

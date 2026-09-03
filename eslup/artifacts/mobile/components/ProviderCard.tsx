import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Provider } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { GlassCard } from "./GlassCard";

interface ProviderCardProps {
  provider: Provider;
  compact?: boolean;
}

const SERVICE_ICON_MAP: Record<string, string> = {
  onsite: "activity",
  online: "video",
  homecare: "home",
};

export function ProviderCard({ provider, compact = false }: ProviderCardProps) {
  const colors = useColors();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/provider-detail", params: { id: provider.id } });
  };

  const initials = provider.name
    .split(" ")
    .slice(0, 2)
    .map((n: string) => n[0])
    .join("");

  return (
    <Pressable onPress={handlePress} style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}>
      <GlassCard style={styles.card}>
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: colors.glassLight, borderColor: colors.border }]}>
            {provider.avatar ? (
              <Image source={{ uri: provider.avatar }} style={styles.avatarImg} />
            ) : (
              <Text style={[styles.initials, { color: colors.primary }]}>{initials}</Text>
            )}
          </View>

          <View style={styles.info}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                {provider.name}
              </Text>
              {provider.onlineStatus && (
                <View style={[styles.onlineDot, { backgroundColor: colors.success }]} />
              )}
            </View>
            <Text style={[styles.specialty, { color: colors.mutedForeground }]} numberOfLines={1}>
              {provider.specialty}
            </Text>
            <View style={styles.metaRow}>
              <Feather name="star" size={12} color={colors.warning} />
              <Text style={[styles.rating, { color: colors.foreground }]}>{provider.rating}</Text>
              <Text style={[styles.reviews, { color: colors.mutedForeground }]}>
                ({provider.reviewCount})
              </Text>
              {provider.distance && (
                <>
                  <View style={[styles.dot, { backgroundColor: colors.mutedForeground }]} />
                  <Feather name="map-pin" size={11} color={colors.mutedForeground} />
                  <Text style={[styles.distance, { color: colors.mutedForeground }]}>
                    {provider.distance}
                  </Text>
                </>
              )}
            </View>
          </View>

          <View style={styles.priceCol}>
            <Text style={[styles.price, { color: colors.primary }]}>
              {(provider.price / 100).toLocaleString()}
            </Text>
            <Text style={[styles.priceCurr, { color: colors.mutedForeground }]}>
              {provider.currency}
            </Text>
          </View>
        </View>

        {!compact && (
          <View style={styles.footer}>
            <View style={styles.serviceTypes}>
              {provider.serviceTypes.map((type: string) => (
                <View key={type} style={[styles.serviceTag, { backgroundColor: colors.glassLight, borderColor: colors.border }]}>
                  <Feather name={SERVICE_ICON_MAP[type] as any} size={11} color={colors.primary} />
                  <Text style={[styles.serviceLabel, { color: colors.primary }]}>
                    {type === "onsite" ? "Clinic" : type === "online" ? "Online" : "Homecare"}
                  </Text>
                </View>
              ))}
            </View>

            {!provider.available && (
              <View style={[styles.unavailBadge, { backgroundColor: "rgba(239,68,68,0.15)" }]}>
                <Text style={[styles.unavailText, { color: colors.destructive }]}>Unavailable</Text>
              </View>
            )}
          </View>
        )}
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  initials: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  info: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  specialty: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rating: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  reviews: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 2,
  },
  distance: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  priceCol: {
    alignItems: "flex-end",
  },
  price: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  priceCurr: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 6,
  },
  serviceTypes: {
    flexDirection: "row",
    gap: 6,
    flex: 1,
    flexWrap: "wrap",
  },
  serviceTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  serviceLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
  unavailBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  unavailText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
  },
});

import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AmbulanceButton } from "@/components/AmbulanceButton";
import { useApp } from "@/context/AppContext";
import { ADDIS_HOSPITALS, Hospital } from "@/data/ethiopianHospitals";
import { getInstitutions, Institution } from "@/lib/supabase";
import { useColors } from "@/hooks/useColors";
import { useTranslation } from "@/constants/translations";
import { getActiveBanners } from "@/lib/supabase";

const PULSE_LOGO   = require("../../assets/images/pulse-logo.jpg");
const PULSE_BANNER = require("../../assets/images/pulse-hd-banner.png");

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BANNER_WIDTH = SCREEN_WIDTH - 32; // 16px margin each side

type Category = "all" | "hospitals" | "clinics";

type BannerItem = {
  id: string;
  title: string;
  message: string;
  promoCode: string;
  imageUrl?: string;
  linkUrl?: string;
};

const FALLBACK_BANNERS: BannerItem[] = [
  {
    id: "1",
    title: "30% Off First Consultation",
    message: "Ethiopia's trusted health platform",
    promoCode: "PULSE30",
  },
  {
    id: "2",
    title: "Free Video Consultation",
    message: "Connect with top doctors from home",
    promoCode: "VIDEO-FREE",
  },
  {
    id: "3",
    title: "Teleradiology Now Available",
    message: "AI-powered diagnostic imaging reports",
    promoCode: "RADIOLOGY10",
  },
];

function DarkGradientContainer({ children }: { children: React.ReactNode }) {
  return (
    <LinearGradient colors={["#202937", "#315d93"]} style={{ flex: 1 }}>
      {children}
    </LinearGradient>
  );
}

function LightBgContainer({ children }: { children: React.ReactNode }) {
  return <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>{children}</View>;
}

export default function ExploreScreen() {
  const colors  = useColors();
  const insets  = useSafeAreaInsets();
  const { unreadCount, language } = useApp();
  const t       = useTranslation(language);
  const isRTL   = language === "ar";

  const [bannerVisible, setBannerVisible] = useState(true);
  const [banners, setBanners]             = useState<BannerItem[]>(FALLBACK_BANNERS);
  const [currentIndex, setCurrentIndex]   = useState(0);
  const bannerAnim  = useRef(new Animated.Value(1)).current;
  const flatListRef = useRef<FlatList<BannerItem>>(null);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);

  const [category, setCategory]       = useState<Category>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [hospitals, setHospitals]     = useState<Hospital[]>(ADDIS_HOSPITALS);
  const topPad    = Platform.OS === "web" ? 0 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const isDark      = colors.isDark;
  const textPrimary = isDark ? "#FFFFFF" : "#202937";
  const textMuted   = isDark ? "#D1D5DB" : "#4B5563";
  const cardBg      = isDark ? "rgba(255,255,255,0.08)" : "#F8FAFC";
  const borderCol   = isDark ? "rgba(255,255,255,0.12)" : "#E2E8F0";

  const SERVICE_CARDS = [
    { id: "doctors",              iconName: "user"     as const, label: t("doctors"),              desc: t("gp_specialists"),       color: "#315d93" },
    { id: "nurses",               iconName: "heart"    as const, label: t("nurses"),               desc: t("nursing_professionals"), color: "#059669" },
    { id: "homecare",             iconName: "home"     as const, label: t("home_care"),            desc: t("in_home_care"),         color: "#D97706" },
    { id: "physiotherapy",        iconName: "zap"      as const, label: t("physiotherapy"),        desc: t("rehab_therapy"),        color: "#7C3AED" },
    { id: "health_institutions",  iconName: "activity" as const, label: t("health_institutions"),  desc: t("clinics_facilities"),   color: "#DC2626" },
  ];

  const CATEGORY_LABELS: Record<Category, string> = {
    all:       t("all"),
    hospitals: t("hospitals"),
    clinics:   t("clinics"),
  };

  // ── Auto-advance timer ──────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % banners.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 4000);
  }, [banners.length]);

  useEffect(() => {
    if (bannerVisible) startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [bannerVisible, startTimer]);

  // ── Load hospitals from Supabase (falls back to local data) ────────────────
  useEffect(() => {
    let active = true;
    getInstitutions()
      .then((data) => { if (active && data.length > 0) setHospitals(data as unknown as Hospital[]); })
      .catch(() => { /* keep ADDIS_HOSPITALS fallback */ });
    return () => { active = false; };
  }, []);

  // ── Load Supabase banners ───────────────────────────────────────────────────
  useEffect(() => {
    let active = true;
    (async () => {
      const remote = await getActiveBanners();
      if (!active || !remote?.length) return;
      setBanners(
        remote.map((b: any, i: number) => ({
          id:       String(i),
          title:    b.title    ?? "",
          message:  b.message  ?? "",
          promoCode: b.promoCode ?? "",
          imageUrl: b.imageUrl  ?? undefined,
          linkUrl:  b.linkUrl   ?? undefined,
        }))
      );
    })();
    return () => { active = false; };
  }, []);

  const dismissBanner = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (timerRef.current) clearInterval(timerRef.current);
    Animated.timing(bannerAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(
      () => setBannerVisible(false)
    );
  };

  const openPromoLink = async (banner: BannerItem) => {
    if (!banner.linkUrl) return;
    try {
      await Linking.openURL(banner.linkUrl);
    } catch {
      Alert.alert("Unable to open promo link.");
    }
  };

  const onBannerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / BANNER_WIDTH);
    if (idx !== currentIndex) {
      setCurrentIndex(idx);
      startTimer(); // reset timer on manual swipe
    }
  };

  const { useMemo } = React;
  const filteredHospitals = useMemo(() => {
    let list = hospitals;
    if (category === "hospitals") list = list.filter((h) => h.categories.includes("hospital"));
    if (category === "clinics")   list = list.filter((h) => h.categories.includes("clinic"));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.address.toLowerCase().includes(q) ||
          h.type.toLowerCase().includes(q) ||
          h.services.some((s) => s.toLowerCase().includes(q))
      );
    }
    return list;
  }, [category, searchQuery, hospitals]);

  const callHospital = (phone: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const url = `tel:${phone.replace(/\s/g, "")}`;
    if (Platform.OS === "web") { Alert.alert(t("call"), `Calling ${phone}…`); return; }
    Linking.canOpenURL(url).then((can) => { if (can) Linking.openURL(url); });
  };

  const Container = isDark ? DarkGradientContainer : LightBgContainer;

  const renderBannerItem = ({ item }: { item: BannerItem }) => {
    const hasText = !!(item.title || item.message || item.promoCode);
    return (
      <Pressable
        onPress={() => openPromoLink(item)}
        style={{ width: BANNER_WIDTH }}
      >
        <Image
          source={item.imageUrl ? { uri: item.imageUrl } : PULSE_BANNER}
          style={styles.bannerImage}
          resizeMode="cover"
        />
        {hasText && (
          <View style={styles.bannerOverlay}>
            <View style={styles.bannerContent}>
              {!!item.promoCode && (
                <View style={[styles.promoCodeBadge, { backgroundColor: "rgba(49,93,147,0.85)" }]}>
                  <Text style={styles.promoCodeLabel}>PROMO</Text>
                  <Text style={styles.promoCode}>{item.promoCode}</Text>
                </View>
              )}
              {!!item.title   && <Text style={styles.bannerTitle}>{item.title}</Text>}
              {!!item.message && <Text style={styles.bannerSub}>{item.message}</Text>}
            </View>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <Container>
      {/* ── Sticky Header ── */}
      <View style={[styles.stickyHeader, { paddingTop: topPad + 10, backgroundColor: isDark ? "rgba(0,0,0,0.15)" : "#FFFFFF", borderBottomColor: borderCol }]}>
        <View style={[styles.headerRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Image source={PULSE_LOGO} style={styles.logoCircle} resizeMode="cover" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.pulseName,    { color: textPrimary, textAlign: isRTL ? "right" : "left" }]}>PULSE</Text>
            <Text style={[styles.pulseTagline, { color: "#315d93",   textAlign: isRTL ? "right" : "left" }]}>HEALTH-TECH SOLUTION</Text>
          </View>
          <Pressable
            onPress={() => router.push("/notifications")}
            style={[styles.notifBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.10)" : "#F1F5F9" }]}
          >
            <Feather name="bell" size={20} color={textPrimary} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: bottomPad + 110 }}>

        {/* ── Promo Carousel ── */}
        {bannerVisible && (
          <Animated.View style={[styles.carouselWrapper, { opacity: bannerAnim }]}>
            {/* X dismiss button */}
            <Pressable onPress={dismissBanner} style={styles.dismissBtn} hitSlop={10}>
              <Feather name="x" size={13} color="#fff" />
            </Pressable>

            <FlatList
              ref={flatListRef}
              data={banners}
              keyExtractor={(item) => item.id}
              renderItem={renderBannerItem}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={onBannerScroll}
              scrollEventThrottle={16}
              getItemLayout={(_, index) => ({
                length: BANNER_WIDTH,
                offset: BANNER_WIDTH * index,
                index,
              })}
              style={{ borderRadius: 14, overflow: "hidden" }}
            />

            {/* Dot indicators */}
            {banners.length > 1 && (
              <View style={styles.dotsRow}>
                {banners.map((_, i) => (
                  <Pressable
                    key={i}
                    onPress={() => {
                      flatListRef.current?.scrollToIndex({ index: i, animated: true });
                      setCurrentIndex(i);
                      startTimer();
                    }}
                    style={[
                      styles.dot,
                      i === currentIndex ? styles.dotActive : styles.dotInactive,
                    ]}
                  />
                ))}
              </View>
            )}
          </Animated.View>
        )}

        {/* ── Search ── */}
        <View style={[styles.searchSection, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <View style={[styles.searchBar, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F4F7FB", borderColor: borderCol, flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <Feather name="search" size={16} color={textMuted} style={{ marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 }} />
            <TextInput
              style={[styles.searchInput, { color: textPrimary, textAlign: isRTL ? "right" : "left" }]}
              placeholder={t("search_placeholder")}
              placeholderTextColor={textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery("")} style={{ paddingRight: isRTL ? 0 : 12, paddingLeft: isRTL ? 12 : 0 }}>
                <Feather name="x" size={14} color={textMuted} />
              </Pressable>
            )}
          </View>
          <Pressable
            onPress={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              // Navigate to the provider tab and open the map view directly
              router.push({ pathname: "/(tabs)/healthcare" as any, params: { openMap: "1" } });
            }}
            style={[styles.findNearbyBtn, { flexDirection: isRTL ? "row-reverse" : "row" }]}
          >
            <Feather name="map-pin" size={14} color="#fff" />
            <Text style={styles.findNearbyText}>{t("find_nearby")}</Text>
          </Pressable>
        </View>

        {/* ── Choose a Service ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: textPrimary, textAlign: isRTL ? "right" : "left" }]}>{t("choose_service")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.serviceRow}>
            {SERVICE_CARDS.map((svc) => (
              <Pressable
                key={svc.id}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push({ pathname: "/service", params: { type: svc.id } }); }}
                style={({ pressed }) => [styles.serviceCard, { backgroundColor: "#202937", opacity: pressed ? 0.9 : 1, shadowColor: "#202937", shadowOpacity: 0.2, shadowOffset: { width: 0, height: 3 }, shadowRadius: 8, elevation: 3 }]}
              >
                <View style={[styles.serviceIconWrap, { backgroundColor: svc.color + "28" }]}>
                  <Feather name={svc.iconName} size={22} color={svc.color} />
                </View>
                <Text style={[styles.serviceCardLabel, { textAlign: isRTL ? "right" : "left" }]}>{svc.label}</Text>
                <Text style={[styles.serviceCardDesc,  { textAlign: isRTL ? "right" : "left" }]}>{svc.desc}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* ── Category Filters ── */}
        <View style={[styles.filterSection]}>
          <View style={[styles.resultsHeaderRow, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
            <View>
              <Text style={[styles.sectionTitle, { color: textPrimary, textAlign: isRTL ? "right" : "left" }]}>{t("health_facilities")}</Text>
              <Text style={[styles.resultsSub, { color: textMuted, textAlign: isRTL ? "right" : "left" }]}>{filteredHospitals.length} results · Addis Ababa</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 10 }}>
            {(["all", "hospitals", "clinics"] as Category[]).map((cat) => {
              const active = category === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCategory(cat); }}
                  style={[styles.filterChip, { backgroundColor: active ? "#315d93" : (isDark ? "rgba(255,255,255,0.08)" : "#EEF3FA"), borderColor: active ? "#315d93" : borderCol }]}
                >
                  <Text style={[styles.filterChipText, { color: active ? "#fff" : textMuted }]}>{CATEGORY_LABELS[cat]}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Hospital List ── */}
        <View style={{ paddingHorizontal: 16, gap: 14 }}>
          {filteredHospitals.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="search" size={40} color={textMuted} />
              <Text style={[styles.emptyTitle, { color: textPrimary }]}>{t("no_results")}</Text>
              <Text style={[styles.emptyText,  { color: textMuted }]}>Try a different search term or category.</Text>
            </View>
          ) : (
            filteredHospitals.map((hospital) => (
              <HospitalCard
                key={hospital.id}
                hospital={hospital}
                isDark={isDark}
                textPrimary={textPrimary}
                textMuted={textMuted}
                cardBg={cardBg}
                borderCol={borderCol}
                callLabel={t("call")}
                viewMapLabel={t("view_on_map")}
                onCall={() => callHospital(hospital.phone)}
              />
            ))
          )}
        </View>
      </ScrollView>

      <AmbulanceButton visible={true} />
    </Container>
  );
}

// ── Hospital Card ────────────────────────────────────────────────────────────
function HospitalCard({ hospital, isDark, textPrimary, textMuted, cardBg, borderCol, callLabel, viewMapLabel, onCall }: {
  hospital: Hospital; isDark: boolean; textPrimary: string; textMuted: string; cardBg: string; borderCol: string;
  callLabel: string; viewMapLabel: string;
  onCall: () => void;
}) {
  const initials = hospital.name.split(" ").slice(0, 2).map((w) => w[0]).join("");
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: "/institute/[id]" as any, params: { id: hospital.id } });
      }}
      style={({ pressed }) => [
        styles.hospCard,
        { backgroundColor: cardBg, borderColor: borderCol, shadowColor: isDark ? "#000" : "#CBD5E1", shadowOpacity: isDark ? 0.2 : 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, opacity: pressed ? 0.92 : 1 },
      ]}
    >
      <View style={[styles.hospThumb, { backgroundColor: hospital.color + "18" }]}>
        <View style={[styles.hospThumbInner, { backgroundColor: hospital.color }]}>
          <Text style={styles.hospThumbInitials}>{initials}</Text>
        </View>
        {hospital.open24h && (
          <View style={styles.open24Badge}>
            <Text style={styles.open24Text}>24/7</Text>
          </View>
        )}
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <Text style={[styles.hospName, { color: textPrimary }]} numberOfLines={2}>{hospital.name}</Text>
        <View style={[styles.typeBadge, { backgroundColor: hospital.type === "Government" ? "#315d93" + "18" : hospital.type === "Private" ? "#D97706" + "18" : "#059669" + "18" }]}>
          <Text style={[styles.typeText, { color: hospital.type === "Government" ? "#315d93" : hospital.type === "Private" ? "#D97706" : "#059669" }]}>
            {hospital.type}
          </Text>
        </View>
        <View style={styles.metaRow}>
          <Feather name="map-pin" size={11} color={textMuted} />
          <Text style={[styles.hospAddr, { color: textMuted }]} numberOfLines={1}>{hospital.address}</Text>
        </View>
        <View style={styles.metaRow}>
          <Feather name="star" size={11} color="#D97706" />
          <Text style={[styles.hospRating, { color: textPrimary }]}>{hospital.rating}</Text>
          <View style={styles.metaDot} />
          <Feather name="navigation" size={11} color={textMuted} />
          <Text style={{ color: textMuted, fontSize: 11, fontFamily: "Inter_400Regular" }}>{hospital.distanceKm} km</Text>
          {hospital.open24h && (
            <>
              <View style={styles.metaDot} />
              <Text style={{ color: "#059669", fontSize: 11, fontFamily: "Inter_600SemiBold" }}>Open 24/7</Text>
            </>
          )}
        </View>
        <View style={styles.hospBtns}>
          <Pressable onPress={onCall} style={({ pressed }) => [styles.hospBtn, { backgroundColor: "#315d93", opacity: pressed ? 0.85 : 1 }]}>
            <Feather name="phone" size={13} color="#fff" />
            <Text style={styles.hospBtnText}>{callLabel}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              const label = encodeURIComponent(hospital.name);
              const url = Platform.select({
                ios: `maps:0,0?q=${label}@${hospital.lat},${hospital.lng}`,
                android: `geo:${hospital.lat},${hospital.lng}?q=${hospital.lat},${hospital.lng}(${label})`,
                default: `https://www.google.com/maps/search/?api=1&query=${hospital.lat},${hospital.lng}`,
              });
              Linking.openURL(url!).catch(() =>
                Linking.openURL(
                  `https://www.google.com/maps/search/?api=1&query=${hospital.lat},${hospital.lng}`
                )
              );
            }}
            style={({ pressed }) => [styles.hospBtn, { backgroundColor: "#202937", opacity: pressed ? 0.85 : 1 }]}
          >
            <Feather name="map-pin" size={13} color="#fff" />
            <Text style={styles.hospBtnText}>{viewMapLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stickyHeader:    { paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 0.5 },
  headerRow:       { alignItems: "center", gap: 10, marginBottom: 4 },
  logoCircle:      { width: 40, height: 40, borderRadius: 20 },
  pulseName:       { fontSize: 20, fontFamily: "Inter_700Bold", letterSpacing: 4 },
  pulseTagline:    { fontSize: 9, fontFamily: "Inter_500Medium", letterSpacing: 1.5 },
  notifBtn:        { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  badge:           { position: "absolute", top: -2, right: -2, backgroundColor: "#DC2626", borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 2 },
  badgeText:       { color: "#fff", fontSize: 9, fontFamily: "Inter_700Bold" },

  // ── Carousel ──
  carouselWrapper: { marginHorizontal: 16, marginTop: 14 },
  dismissBtn:      { position: "absolute", top: 8, right: 8, zIndex: 10, backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 14, width: 26, height: 26, alignItems: "center", justifyContent: "center" },
  bannerImage:     { width: BANNER_WIDTH, height: 165 },
  bannerOverlay:   { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(32,41,55,0.50)", justifyContent: "flex-end", padding: 16 },
  bannerContent:   { gap: 6 },
  promoCodeBadge:  { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  promoCodeLabel:  { color: "rgba(255,255,255,0.75)", fontSize: 8, fontFamily: "Inter_500Medium", letterSpacing: 1 },
  promoCode:       { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  bannerTitle:     { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" },
  bannerSub:       { color: "rgba(255,255,255,0.8)", fontSize: 12, fontFamily: "Inter_400Regular" },
  dotsRow:         { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 8 },
  dot:             { borderRadius: 4 },
  dotActive:       { width: 20, height: 5, backgroundColor: "#315d93" },
  dotInactive:     { width: 6, height: 5, backgroundColor: "rgba(49,93,147,0.30)" },

  // ── Search ──
  searchSection:   { gap: 10, paddingHorizontal: 16, marginTop: 16, marginBottom: 4 },
  searchBar:       { flex: 1, alignItems: "center", borderRadius: 12, borderWidth: 1 },
  searchInput:     { flex: 1, paddingVertical: 11, paddingHorizontal: 10, fontSize: 13, fontFamily: "Inter_400Regular" },
  findNearbyBtn:   { alignItems: "center", gap: 6, backgroundColor: "#315d93", paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, shadowColor: "#315d93", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5 },
  findNearbyText:  { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },

  // ── Services ──
  section:         { paddingHorizontal: 16, marginTop: 18 },
  sectionTitle:    { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 4 },
  serviceRow:      { gap: 10, paddingBottom: 4, paddingTop: 10 },
  serviceCard:     { width: 118, borderRadius: 14, padding: 14, gap: 8 },
  serviceIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  serviceCardLabel: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
  serviceCardDesc:  { color: "rgba(255,255,255,0.6)", fontSize: 10, fontFamily: "Inter_400Regular" },

  // ── Filters ──
  filterSection:    { paddingHorizontal: 16, marginTop: 20 },
  resultsHeaderRow: { alignItems: "flex-end", justifyContent: "space-between" },
  resultsSub:       { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  filterChip:       { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 20, borderWidth: 1 },
  filterChipText:   { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  // ── Empty ──
  emptyState: { alignItems: "center", gap: 12, paddingVertical: 48 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  emptyText:  { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },

  // ── Hospital card ──
  hospCard:         { borderRadius: 14, borderWidth: 1, overflow: "hidden", flexDirection: "row", gap: 12, padding: 12 },
  hospThumb:        { width: 80, height: 108, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  hospThumbInner:   { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  hospThumbInitials:{ color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  open24Badge:      { position: "absolute", bottom: 6, left: 6, backgroundColor: "#059669", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  open24Text:       { color: "#fff", fontSize: 9, fontFamily: "Inter_700Bold" },
  hospName:         { fontSize: 14, fontFamily: "Inter_700Bold", lineHeight: 20, marginBottom: 2 },
  typeBadge:        { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeText:         { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  metaRow:          { flexDirection: "row", alignItems: "center", gap: 4 },
  hospAddr:         { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular" },
  hospRating:       { fontSize: 12, fontFamily: "Inter_700Bold" },
  metaDot:          { width: 3, height: 3, borderRadius: 2, backgroundColor: "#94A3B8", marginHorizontal: 2 },
  hospBtns:         { flexDirection: "row", gap: 8, marginTop: 6 },
  hospBtn:          { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 8, borderRadius: 8 },
  hospBtnText:      { color: "#fff", fontSize: 11, fontFamily: "Inter_600SemiBold" },
});

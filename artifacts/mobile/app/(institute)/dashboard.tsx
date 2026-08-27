import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl, Platform, ActivityIndicator, TextInput, KeyboardAvoidingView, Alert } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { getInstitutionByUserId, upsertInstitution } from "@/lib/supabase";

const INSTITUTE_CATEGORIES = [
  "Hospital", "Clinic", "Laboratory", "Pharmacy", "Imaging", 
  "Dental", "Rehabilitation", "Mental Health", "Eye Care", "Other"
];

const CITY_OPTIONS = [
  "Addis Ababa", "Dire Dawa", "Mekelle", "Gondar", "Hawassa",
  "Bahir Dar", "Jimma", "Dessie", "Jijiga", "Shashemene",
];

const AVAILABLE_SERVICES = [
  "24/7 Emergency", "Intensive Care Unit (ICU)", "Outpatient Department", 
  "Inpatient Wards", "Surgical Operations", "Maternity & Delivery",
  "Pediatrics", "Internal Medicine", "General Surgery", "Orthopedics",
  "Ophthalmology", "Dental Care", "Physiotherapy", "Dialysis",
  "Pharmacy", "Laboratory Services", "X-Ray", "Ultrasound", "CT Scan", "MRI"
];

export default function InstituteDashboardScreen() {
  const { user } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [institutionId, setInstitutionId] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "profile" | "services">("overview");
  
  const [form, setForm] = useState({
    name: "",
    type: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    totalDoctors: "",
    totalBeds: "",
    lat: "",
    lng: ""
  });
  
  const [services, setServices] = useState<string[]>([]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const bg = colors.isDark ? colors.background : "#F8FAFC";
  const cardBg = colors.isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF";
  const borderCol = colors.isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0";
  const inputBg = colors.isDark ? "rgba(255,255,255,0.08)" : "#F8FAFC";
  const textPrimary = colors.isDark ? "#FFFFFF" : "#1E293B";
  const textMuted = colors.isDark ? "#94A3B8" : "#64748B";
  const accentColor = "#0D9488"; // teal for institutes
  
  const fetchData = async () => {
    if (!user?.id) return;
    try {
      const data = await getInstitutionByUserId(user.id);
      if (data) {
        if (data.status !== "Active") {
          router.replace("/(institute)/status");
          return;
        }
        setInstitutionId(data.id || "");
        setForm({
          name: data.name || "",
          type: data.type || "Other",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          city: data.city || "",
          totalDoctors: data.totalDoctors ? data.totalDoctors.toString() : "",
          totalBeds: data.totalBeds ? data.totalBeds.toString() : "",
          lat: data.lat ? data.lat.toString() : "",
          lng: data.lng ? data.lng.toString() : ""
        });
        setServices(data.services || []);
      } else {
        Alert.alert("Institute Not Found", "No institute application is linked to this account.");
        router.replace("/(tabs)/you");
      }
    } catch (error: any) {
      Alert.alert("Unable to Load Institute", error?.message ?? "Could not load your institute profile.");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [user?.id])
  );
  
  const handleSave = async () => {
    if (!user?.id) return;
    if (!form.name.trim() || !form.phone.trim() || !form.city.trim()) {
      Alert.alert("Missing Information", "Institute name, phone, and city are required.");
      return;
    }
    const hasLatitude = form.lat.trim().length > 0;
    const hasLongitude = form.lng.trim().length > 0;
    if (hasLatitude !== hasLongitude) {
      Alert.alert("Incomplete Location", "Enter both latitude and longitude, or leave both blank.");
      return;
    }
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      let lat = form.lat ? parseFloat(form.lat) : undefined;
      let lng = form.lng ? parseFloat(form.lng) : undefined;
      
      if ((lat !== undefined && isNaN(lat)) || (lng !== undefined && isNaN(lng))) {
        throw new Error("Latitude and longitude must be valid numbers.");
      }
      
      const currentData = await getInstitutionByUserId(user.id);
      if (!currentData || currentData.status !== "Active") {
        router.replace("/(institute)/status");
        return;
      }
      
      await upsertInstitution({
        ...(currentData || {}),
        id: institutionId,
        userId: user.id,
        name: form.name,
        type: form.type,
        email: form.email,
        phone: form.phone,
        address: form.address,
        city: form.city,
        totalDoctors: form.totalDoctors ? parseInt(form.totalDoctors) : 0,
        totalBeds: form.totalBeds ? parseInt(form.totalBeds) : undefined,
        lat,
        lng,
        services,
        status: currentData.status
      });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Changes Saved", "Your institute profile is now up to date.");
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Save Failed", error?.message ?? "Could not save your institute profile.");
    } finally {
      setSaving(false);
    }
  };
  
  const toggleService = (service: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (services.includes(service)) {
      setServices(services.filter(s => s !== service));
    } else {
      setServices([...services, service]);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bg, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={accentColor} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: topPad + 10, backgroundColor: cardBg, borderBottomColor: borderCol }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={24} color={textPrimary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: textPrimary }]}>{form.name}</Text>
          <Pressable onPress={() => router.push("/(tabs)/you")} style={[styles.iconBtn, { backgroundColor: accentColor + "15" }]}>
            <Feather name="user" size={20} color={accentColor} />
          </Pressable>
        </View>
        
        <View style={styles.tabs}>
          {(["overview", "profile", "services"] as const).map(tab => {
            const isActive = activeTab === tab;
            return (
              <Pressable 
                key={tab}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setActiveTab(tab);
                }}
                style={[styles.tab, isActive && { borderBottomColor: accentColor }]}
              >
                <Text style={[
                  styles.tabText, 
                  { color: isActive ? accentColor : textMuted, fontFamily: isActive ? "Inter_600SemiBold" : "Inter_500Medium" }
                ]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 80 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === "overview" && (
          <View style={styles.tabContent}>
            <View style={[styles.summaryCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <View style={styles.summaryHeader}>
                <View style={[styles.summaryIcon, { backgroundColor: accentColor + "15" }]}>
                  <Feather name="activity" size={24} color={accentColor} />
                </View>
                <View>
                  <Text style={[styles.summaryTitle, { color: textPrimary }]}>Institute Status</Text>
                  <Text style={[styles.summarySub, { color: accentColor }]}>Active and Listed</Text>
                </View>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: borderCol }]} />
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: textPrimary }]}>{form.totalDoctors || "0"}</Text>
                  <Text style={[styles.statLabel, { color: textMuted }]}>Doctors</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: borderCol }]} />
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: textPrimary }]}>{form.totalBeds || "0"}</Text>
                  <Text style={[styles.statLabel, { color: textMuted }]}>Beds</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: borderCol }]} />
                <View style={styles.statBox}>
                  <Text style={[styles.statValue, { color: textPrimary }]}>{services.length}</Text>
                  <Text style={[styles.statLabel, { color: textMuted }]}>Services</Text>
                </View>
              </View>
            </View>
            
            <Text style={[styles.sectionTitle, { color: textPrimary, marginTop: 12 }]}>Quick Information</Text>
            
            <View style={[styles.infoList, { backgroundColor: cardBg, borderColor: borderCol }]}>
              {[
                { icon: "map-pin", label: "Location", value: `${form.city}${form.address ? `, ${form.address}` : ""}` },
                { icon: "phone", label: "Contact", value: form.phone },
                { icon: "mail", label: "Email", value: form.email },
                { icon: "grid", label: "Category", value: form.type },
              ].map((item, idx, arr) => (
                <View key={item.label} style={[
                  styles.infoRow, 
                  idx < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: borderCol }
                ]}>
                  <Feather name={item.icon as any} size={18} color={textMuted} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.infoLabel, { color: textMuted }]}>{item.label}</Text>
                    <Text style={[styles.infoValue, { color: textPrimary }]}>{item.value || "Not set"}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
        
        {activeTab === "profile" && (
          <View style={styles.tabContent}>
            <View style={[styles.formGroup, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <Text style={[styles.groupTitle, { color: textPrimary }]}>Basic Details</Text>
              
              <View style={styles.inputWrap}>
                <Text style={[styles.inputLabel, { color: textMuted }]}>Institute Name</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, borderColor: borderCol, color: textPrimary }]}
                  value={form.name}
                  onChangeText={(v) => setForm(p => ({ ...p, name: v }))}
                  placeholder="Hospital Name"
                  placeholderTextColor={textMuted}
                />
              </View>
              
              <View style={styles.inputWrap}>
                <Text style={[styles.inputLabel, { color: textMuted }]}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {INSTITUTE_CATEGORIES.map(cat => (
                    <Pressable
                      key={cat}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setForm(p => ({ ...p, type: cat }));
                      }}
                      style={[
                        styles.chip,
                        { backgroundColor: inputBg, borderColor: form.type === cat ? accentColor : borderCol },
                        form.type === cat && { backgroundColor: accentColor + "15" }
                      ]}
                    >
                      <Text style={[styles.chipText, { color: form.type === cat ? accentColor : textPrimary }]}>{cat}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
              
              <View style={styles.rowInputs}>
                <View style={[styles.inputWrap, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: textMuted }]}>Total Doctors</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, borderColor: borderCol, color: textPrimary }]}
                    value={form.totalDoctors}
                    onChangeText={(v) => setForm(p => ({ ...p, totalDoctors: v.replace(/[^0-9]/g, '') }))}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={textMuted}
                  />
                </View>
                <View style={[styles.inputWrap, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: textMuted }]}>Total Beds</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, borderColor: borderCol, color: textPrimary }]}
                    value={form.totalBeds}
                    onChangeText={(v) => setForm(p => ({ ...p, totalBeds: v.replace(/[^0-9]/g, '') }))}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={textMuted}
                  />
                </View>
              </View>
            </View>
            
            <View style={[styles.formGroup, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <Text style={[styles.groupTitle, { color: textPrimary }]}>Contact & Location</Text>
              
              <View style={styles.inputWrap}>
                <Text style={[styles.inputLabel, { color: textMuted }]}>Phone Number</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, borderColor: borderCol, color: textPrimary }]}
                  value={form.phone}
                  onChangeText={(v) => setForm(p => ({ ...p, phone: v }))}
                  keyboardType="phone-pad"
                  placeholder="Phone Number"
                  placeholderTextColor={textMuted}
                />
              </View>
              
              <View style={styles.inputWrap}>
                <Text style={[styles.inputLabel, { color: textMuted }]}>City</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {CITY_OPTIONS.map(city => (
                    <Pressable
                      key={city}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setForm(p => ({ ...p, city }));
                      }}
                      style={[
                        styles.chip,
                        { backgroundColor: inputBg, borderColor: form.city === city ? accentColor : borderCol },
                        form.city === city && { backgroundColor: accentColor + "15" }
                      ]}
                    >
                      <Text style={[styles.chipText, { color: form.city === city ? accentColor : textPrimary }]}>{city}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
              
              <View style={styles.inputWrap}>
                <Text style={[styles.inputLabel, { color: textMuted }]}>Address Details</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: inputBg, borderColor: borderCol, color: textPrimary }]}
                  value={form.address}
                  onChangeText={(v) => setForm(p => ({ ...p, address: v }))}
                  placeholder="Street, Woreda, Building"
                  placeholderTextColor={textMuted}
                />
              </View>
              
              <View style={styles.rowInputs}>
                <View style={[styles.inputWrap, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: textMuted }]}>Latitude</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, borderColor: borderCol, color: textPrimary }]}
                    value={form.lat}
                    onChangeText={(v) => setForm(p => ({ ...p, lat: v }))}
                    keyboardType="decimal-pad"
                    placeholder="9.0300"
                    placeholderTextColor={textMuted}
                  />
                </View>
                <View style={[styles.inputWrap, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: textMuted }]}>Longitude</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: inputBg, borderColor: borderCol, color: textPrimary }]}
                    value={form.lng}
                    onChangeText={(v) => setForm(p => ({ ...p, lng: v }))}
                    keyboardType="decimal-pad"
                    placeholder="38.7400"
                    placeholderTextColor={textMuted}
                  />
                </View>
              </View>
            </View>
          </View>
        )}
        
        {activeTab === "services" && (
          <View style={styles.tabContent}>
            <View style={[styles.servicesCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
              <Text style={[styles.servicesDesc, { color: textMuted }]}>
                Select all services and departments available at your facility. These will be visible to patients and providers.
              </Text>
              
              <View style={styles.servicesGrid}>
                {AVAILABLE_SERVICES.map(service => {
                  const isActive = services.includes(service);
                  return (
                    <Pressable
                      key={service}
                      onPress={() => toggleService(service)}
                      style={[
                        styles.serviceItem,
                        { backgroundColor: isActive ? accentColor + "15" : inputBg, borderColor: isActive ? accentColor : borderCol }
                      ]}
                    >
                      <View style={[styles.serviceCheck, { borderColor: isActive ? accentColor : borderCol, backgroundColor: isActive ? accentColor : "transparent" }]}>
                        {isActive && <Feather name="check" size={12} color="#fff" />}
                      </View>
                      <Text style={[styles.serviceText, { color: isActive ? accentColor : textPrimary }]}>{service}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        )}
      </ScrollView>
      
      {(activeTab === "profile" || activeTab === "services") && (
        <View style={[styles.footer, { backgroundColor: cardBg, borderTopColor: borderCol, paddingBottom: bottomPad || 20 }]}>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            testID="save-institute-profile"
            style={({ pressed }) => [
              styles.saveBtn,
              { backgroundColor: accentColor, opacity: pressed || saving ? 0.8 : 1 }
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="save" size={18} color="#fff" />
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backBtn: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: {
    fontSize: 14,
  },
  content: {
    padding: 16,
  },
  tabContent: {
    gap: 16,
  },
  
  // Overview Tab
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  summarySub: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  summaryDivider: {
    height: 1,
    marginVertical: 16,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginLeft: 4,
  },
  infoList: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  infoValue: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
  
  // Profile Tab
  formGroup: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  groupTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 4,
  },
  inputWrap: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  rowInputs: {
    flexDirection: "row",
    gap: 12,
  },
  chipRow: {
    gap: 8,
    paddingRight: 16,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  
  // Services Tab
  servicesCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  servicesDesc: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    marginBottom: 20,
  },
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  serviceItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    width: "100%",
  },
  serviceCheck: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  
  footer: {
    padding: 16,
    borderTopWidth: 1,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  saveBtn: {
    height: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});

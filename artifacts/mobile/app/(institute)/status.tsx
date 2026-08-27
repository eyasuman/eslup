import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl, Platform, ActivityIndicator, Alert } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as DocumentPicker from "expo-document-picker";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { getInstitutionByUserId, signOut, uploadInstituteLicense, upsertInstitution, deleteUpload } from "@/lib/supabase";

export default function InstituteStatusScreen() {
  const { user, setUser, setUserRole } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  
  const [refreshing, setRefreshing] = useState(false);
  const [instStatus, setInstStatus] = useState(user?.instituteStatus || "Pending");
  const [resubmitting, setResubmitting] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(!user?.instituteStatus);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const bg = colors.isDark ? colors.background : "#F8FAFC";
  const cardBg = colors.isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF";
  const borderCol = colors.isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0";
  const textPrimary = colors.isDark ? "#FFFFFF" : "#1E293B";
  const textMuted = colors.isDark ? "#94A3B8" : "#64748B";
  const accentColor = "#0D9488"; // teal for institutes
  
  const fetchStatus = async () => {
    if (!user?.id) return;
    try {
      const data = await getInstitutionByUserId(user.id);
      if (data) {
        setInstStatus(data.status || "Pending");
        if (data.status === "Active") {
          await setUser({ ...user, instituteStatus: "Active", name: data.name });
          router.replace("/(institute)/dashboard");
        } else if (data.status !== user.instituteStatus) {
          await setUser({ ...user, instituteStatus: data.status, name: data.name });
        }
      }
    } catch (error: any) {
      Alert.alert("Unable to Refresh", error?.message ?? "Could not load your institute application.");
    } finally {
      setLoadingInitial(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStatus();
    setRefreshing(false);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchStatus();
    }, [user?.id])
  );

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await signOut();
    } catch {}
    await setUser(null);
    await setUserRole(null);
    router.replace("/(tabs)/you");
  };

  const handleResubmit = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/png", "image/jpg"],
        copyToCacheDirectory: true,
      });
      if (result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setResubmitting(true);
        const file = { name: asset.name, uri: asset.uri, type: asset.mimeType ?? "application/octet-stream" };
        const upload = await uploadInstituteLicense(user!.id, file);
        const currentData = await getInstitutionByUserId(user!.id);
        if (!currentData) {
          await deleteUpload(upload.id).catch(() => {});
          throw new Error("Your institute application could not be found.");
        }
        try {
          await upsertInstitution({
            ...currentData,
            status: "Pending",
            licenseUploadId: upload.id
          });
        } catch (error) {
          await deleteUpload(upload.id).catch(() => {});
          throw error;
        }
        if (upload.replacedUploadId) {
          await deleteUpload(upload.replacedUploadId).catch(() => {});
        }
        setInstStatus("Pending");
        await setUser({ ...user!, instituteStatus: "Pending" });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Application Resubmitted", "Your new operating license is saved and your application is back under review.");
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Resubmission Failed", error?.message ?? "Could not resubmit your application. Please try again.");
    } finally {
      setResubmitting(false);
    }
  };

  const isDeclined = instStatus === "Declined";

  if (loadingInitial) {
    return (
      <View style={[styles.container, { backgroundColor: bg, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={accentColor} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.header, { paddingTop: topPad + 10, borderBottomColor: borderCol }]}>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>Application Status</Text>
        <Pressable onPress={handleSignOut} style={styles.signOutBtn} testID="sign-out-btn">
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.statusCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
          <View style={[
            styles.statusIconWrap, 
            { backgroundColor: isDeclined ? "#FEF2F2" : "#F0FDF4" }
          ]}>
            <Feather 
              name={isDeclined ? "alert-triangle" : "clock"} 
              size={48} 
              color={isDeclined ? "#DC2626" : accentColor} 
            />
          </View>
          
          <Text style={[styles.statusTitle, { color: textPrimary }]}>
            {isDeclined ? "Application Declined" : "Under Review"}
          </Text>
          
          <Text style={[styles.statusDesc, { color: textMuted }]}>
            {isDeclined 
              ? "Your institute application could not be verified. Please review your details, update your operating license, and resubmit." 
              : "We are currently verifying your operating license and details. This process usually takes 24–48 hours."}
          </Text>

          <View style={[
            styles.badge, 
            { backgroundColor: isDeclined ? "#DC262615" : "#0D948815" }
          ]}>
            <Text style={[
              styles.badgeText, 
              { color: isDeclined ? "#DC2626" : accentColor }
            ]}>
              Status: {instStatus}
            </Text>
          </View>
        </View>

        {isDeclined && (
          <View style={[styles.actionCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Text style={[styles.actionTitle, { color: textPrimary }]}>Update Documentation</Text>
            <Text style={[styles.actionDesc, { color: textMuted }]}>
              Please upload a clear, legible copy of your valid Ministry of Health operating license.
            </Text>
            <Pressable 
              onPress={handleResubmit} 
              disabled={resubmitting}
              testID="resubmit-institute-license"
              style={({ pressed }) => [
                styles.resubmitBtn, 
                { backgroundColor: accentColor, opacity: pressed || resubmitting ? 0.8 : 1 }
              ]}
            >
              {resubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="upload" size={18} color="#fff" />
                  <Text style={styles.resubmitBtnText}>Upload & Resubmit</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        <View style={styles.supportBox}>
          <Text style={[styles.supportText, { color: textMuted }]}>
            Need help? Contact support at <Text style={{ color: accentColor }}>providers@pulse.app</Text>
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 20, fontFamily: "Inter_700Bold" },
  signOutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  signOutText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#64748B" },
  content: { padding: 20, gap: 16 },
  statusCard: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 16,
  },
  statusIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statusTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  statusDesc: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  badge: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 8,
  },
  badgeText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  actionCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  actionTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  actionDesc: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  resubmitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 12,
    gap: 8,
    marginTop: 12,
  },
  resubmitBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  supportBox: {
    marginTop: 24,
    alignItems: "center",
  },
  supportText: { fontSize: 13, fontFamily: "Inter_400Regular" },
});

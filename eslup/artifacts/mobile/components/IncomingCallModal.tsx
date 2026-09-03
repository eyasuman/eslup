import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRealtimeCalls } from "@/hooks/useRealtimeCalls";
import { useColors } from "@/hooks/useColors";

interface IncomingCallModalProps {
  doctorUserId: string;
  doctorName: string;
}

export function IncomingCallModal({ doctorUserId, doctorName }: IncomingCallModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { incomingCall, acceptCall, rejectCall } = useRealtimeCalls(doctorUserId);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!incomingCall) {
      pulseAnim.stopAnimation();
      ringAnim.stopAnimation();
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );

    const ring = Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(ringAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    );

    pulse.start();
    ring.start();

    return () => {
      pulse.stop();
      ring.stop();
    };
  }, [incomingCall]);

  if (!incomingCall) return null;

  const handleAccept = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const roomName = await acceptCall(incomingCall);
    router.push({
      pathname: "/video-consultation",
      params: {
        doctorId: incomingCall.doctor_id,
        doctorName,
        specialty: "Video Consultation",
        roomName,
        isDoctor: "true",
        appointmentId: incomingCall.appointment_id,
        callId: incomingCall.id,
      },
    });
  };

  const handleReject = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    await rejectCall(incomingCall);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const ringOpacity = ringAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0] });
  const ringScale = ringAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] });

  return (
    <Modal transparent animationType="slide" visible statusBarTranslucent>
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.isDark ? "#1a2235" : "#FFFFFF",
              paddingTop: topPad + 20,
              borderColor: colors.isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0",
            },
          ]}
        >
          <View style={styles.topSection}>
            <Text style={[styles.incomingLabel, { color: colors.isDark ? "#94A3B8" : "#64748B" }]}>
              Incoming Video Call
            </Text>
            <Text style={[styles.patientName, { color: colors.isDark ? "#FFFFFF" : "#202937" }]}>
              {incomingCall.patient_name}
            </Text>
            <Text style={[styles.patientSub, { color: colors.isDark ? "#94A3B8" : "#64748B" }]}>
              Patient · Requesting Video Consultation
            </Text>
          </View>

          <View style={styles.avatarArea}>
            <Animated.View
              style={[
                styles.ringOuter,
                {
                  opacity: ringOpacity,
                  transform: [{ scale: ringScale }],
                  backgroundColor: "#059669" + "20",
                },
              ]}
            />
            <Animated.View
              style={[
                styles.avatar,
                {
                  transform: [{ scale: pulseAnim }],
                  backgroundColor: "#315d93",
                },
              ]}
            >
              <Feather name="user" size={40} color="#fff" />
            </Animated.View>
          </View>

          <View style={[styles.roomBadge, { backgroundColor: colors.isDark ? "rgba(255,255,255,0.06)" : "#F4F7FB" }]}>
            <Feather name="lock" size={12} color={colors.isDark ? "#94A3B8" : "#64748B"} />
            <Text style={[styles.roomText, { color: colors.isDark ? "#94A3B8" : "#64748B" }]}>
              Appointment-bound invitation
            </Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={handleReject}
              style={({ pressed }) => [styles.rejectBtn, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Feather name="phone-off" size={28} color="#fff" />
              <Text style={styles.actionLabel}>Decline</Text>
            </Pressable>

            <Pressable
              onPress={handleAccept}
              style={({ pressed }) => [styles.acceptBtn, { opacity: pressed ? 0.8 : 1 }]}
            >
              <Feather name="video" size={28} color="#fff" />
              <Text style={styles.actionLabel}>Accept</Text>
            </Pressable>
          </View>

          <View style={{ paddingBottom: insets.bottom + 16 }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-start",
  },
  card: {
    flex: 1,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 0,
    alignItems: "center",
  },
  topSection: {
    alignItems: "center",
    gap: 6,
    marginBottom: 40,
  },
  incomingLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  patientName: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  patientSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  avatarArea: {
    alignItems: "center",
    justifyContent: "center",
    width: 160,
    height: 160,
    marginBottom: 32,
  },
  ringOuter: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  roomBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 60,
  },
  roomText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  actions: {
    flexDirection: "row",
    gap: 60,
    alignItems: "center",
  },
  rejectBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    shadowColor: "#DC2626",
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  acceptBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    shadowColor: "#059669",
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  actionLabel: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
});

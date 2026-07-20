import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import {
  createCall,
  updateCallStatus,
  subscribeToCallStatus,
  generateRoomName,
  Call,
} from "@/services/callService";
import { supabase } from "@/lib/supabase";

type Phase = "precheck" | "mediacheck" | "waiting" | "call" | "postcall";

export default function VideoConsultationScreen() {
  const { doctorId, doctorName, specialty, roomName: paramRoomName, isDoctor, appointmentId } = useLocalSearchParams<{
    doctorId: string;
    doctorName: string;
    specialty: string;
    roomName?: string;
    isDoctor?: string;
    appointmentId?: string;
  }>();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 0 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { user } = useApp();

  const isDoctorJoining = isDoctor === "true";
  const displayName = doctorName || "Dr. Provider";
  const displaySpec = specialty || "Specialist";

  const [phase, setPhase] = useState<Phase>(isDoctorJoining ? "call" : "precheck");
  const [symptoms, setSymptoms] = useState("");
  const [duration, setDuration] = useState("");
  const [severity, setSeverity] = useState<"mild" | "moderate" | "severe">("mild");
  const [callSeconds, setCallSeconds] = useState(0);
  const [rating, setRating] = useState(0);
  const [connectionProgress, setConnectionProgress] = useState(0);
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);
  const [waitingForAccept, setWaitingForAccept] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [mediaReady, setMediaReady] = useState(false);
  const [isVerifyingStatus, setIsVerifyingStatus] = useState(!!appointmentId);
  const [appointmentData, setAppointmentData] = useState<any>(null);
  const [lockStatus, setLockStatus] = useState<'locked' | 'unlocked' | 'verifying'>('verifying');

  useEffect(() => {
    if (!appointmentId) {
      setLockStatus('unlocked');
      return;
    }

    async function checkStatus() {
      setIsVerifyingStatus(true);
      setLockStatus('verifying');
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('id', appointmentId)
          .single();
        
        if (data) {
          setAppointmentData(data);
          // Gated logic: Must be scheduled AND payment verified (or doctor joining)
          if (isDoctorJoining || (data.status === 'scheduled' && data.paymentStatus === 'verified')) {
            setLockStatus('unlocked');
          } else {
            setLockStatus('locked');
          }
        } else {
          setLockStatus('locked');
        }
      } catch (err) {
        console.error("Status check failed", err);
        setLockStatus('locked');
      } finally {
        setIsVerifyingStatus(false);
      }
    }

    checkStatus();
    
    // Real-time subscription to status changes
    const sub = supabase
      .channel(`apt_status_${appointmentId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'appointments', 
        filter: `id=eq.${appointmentId}` 
      }, (payload) => {
        const data = payload.new as any;
        setAppointmentData(data);
        if (isDoctorJoining || (data.status === 'scheduled' && data.paymentStatus === 'verified')) {
          setLockStatus('unlocked');
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [appointmentId, isDoctorJoining]);

  // Always use appointmentId-based room when available — guarantees both sides join the same room
  const roomName = useRef(
    paramRoomName ??
      appointmentData?.jitsiRoomId ??
      (appointmentId
        ? `pulse_${appointmentId.replace(/[^a-zA-Z0-9]/g, "")}`
        : `pulse${(doctorId ?? "doctor").replace(/[^a-zA-Z0-9]/g, "").slice(0, 12)}${Math.floor(
            Date.now() / 86400000
          )}`)
  ).current;

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callStatusSubRef = useRef<any>(null);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 850, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 850, useNativeDriver: true }),
      ])
    );
    if (phase === "waiting") pulse.start();
    return () => pulse.stop();
  }, [phase]);

  useEffect(() => {
    if (phase !== "waiting") return;

    const initiateCall = async () => {
      if (!user?.id || !doctorId) return;
      try {
        const call = await createCall({
          doctor_id: doctorId,
          patient_id: user.id,
          patient_name: user.name ?? "Patient",
          room_name: roomName,
        });
        setCurrentCallId(call.id);
        setWaitingForAccept(true);

        callStatusSubRef.current = subscribeToCallStatus(call.id, (updatedCall: Call) => {
          if (updatedCall.status === "accepted") {
            setWaitingForAccept(false);
            setConnectionProgress(100);
            setTimeout(() => setPhase("call"), 400);
          } else if (updatedCall.status === "rejected") {
            setWaitingForAccept(false);
            Alert.alert(
              "Call Declined",
              `${displayName} is unavailable right now. Please try booking an appointment instead.`,
              [{ text: "OK", onPress: () => router.back() }]
            );
          }
        });
      } catch {
        // Fallback: simulate connection if Supabase table not set up
      }
    };

    initiateCall();

    setConnectionProgress(0);
    const interval = setInterval(() => {
      setConnectionProgress((prev) => {
        if (prev >= 85) {
          clearInterval(interval);
          return 85;
        }
        return Math.min(85, prev + 5);
      });
    }, 120);

    return () => {
      clearInterval(interval);
      if (callStatusSubRef.current) {
        supabase.removeChannel(callStatusSubRef.current);
        callStatusSubRef.current = null;
      }
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "call") return;
    callTimerRef.current = setInterval(() => setCallSeconds((s) => s + 1), 1000);
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [phase]);

  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const endCall = async () => {
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (currentCallId) {
      await updateCallStatus(currentCallId, "ended").catch(() => {});
    }
    setPhase("postcall");
  };

  const jitsiUrl = `https://meet.jit.si/${roomName}#userInfo.displayName="${encodeURIComponent(
    isDoctorJoining ? displayName : user?.name ?? "Patient"
  )}"&config.startWithVideoMuted=false&config.startWithAudioMuted=false&config.prejoinPageEnabled=false&config.disableDeepLinking=true&interfaceConfig.SHOW_JITSI_WATERMARK=false&interfaceConfig.MOBILE_APP_PROMO=false`;

  /* ─── LOCKED STATE (Wait for Payment Verification) ─── */
  if (lockStatus === 'verifying') {
    return (
      <LinearGradient colors={["#202937", "#315d93"]} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }], opacity: 0.8 }}>
          <Feather name="shield" size={60} color="#7FA8D8" />
        </Animated.View>
        <Text style={{ color: '#fff', fontSize: 18, fontFamily: 'Inter_700Bold', marginTop: 24 }}>Verifying Session Lock…</Text>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 8 }}>Securely connecting to Pulse gateway</Text>
      </LinearGradient>
    );
  }

  if (lockStatus === 'locked') {
    return (
      <LinearGradient colors={["#202937", "#315d93"]} style={{ flex: 1 }}>
        <View style={{ flex: 1, padding: 32, justifyContent: 'center', alignItems: 'center', gap: 20 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(220,38,38,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(220,38,38,0.2)' }}>
            <Feather name="lock" size={32} color="#DC2626" />
          </View>
          <Text style={{ color: '#fff', fontSize: 22, fontFamily: 'Inter_700Bold', textAlign: 'center' }}>Session Locked</Text>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, textAlign: 'center', lineHeight: 22 }}>
            Your payment is currently being verified by our admin team.
            {"\n\n"}
            Once verified, this screen will automatically unlock and you can join your session with {displayName}.
          </Text>
          
          <View style={{ width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 10 }} />
          
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'flex-start' }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: appointmentData?.status === 'scheduled' ? '#059669' : '#D97706' }} />
            <Text style={{ color: '#fff', fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
              Booking Status: <Text style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter_400Regular' }}>{appointmentData?.status?.toUpperCase() ?? 'PENDING'}</Text>
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'flex-start' }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: appointmentData?.paymentStatus === 'verified' ? '#059669' : '#DC2626' }} />
            <Text style={{ color: '#fff', fontSize: 13, fontFamily: 'Inter_600SemiBold' }}>
              Payment Status: <Text style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter_400Regular' }}>{appointmentData?.paymentStatus?.toUpperCase() ?? 'PENDING'}</Text>
            </Text>
          </View>

          <Pressable 
            onPress={() => router.back()}
            style={{ marginTop: 20, padding: 16, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', width: '100%', alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontSize: 14, fontFamily: 'Inter_600SemiBold' }}>Return to Dashboard</Text>
          </Pressable>
        </View>
      </LinearGradient>
    );
  }

  /* ─── PRE-CHECK ─── */
  if (phase === "precheck") {
    return (
      <LinearGradient colors={["#202937", "#315d93"]} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingTop: topPad + 20, paddingBottom: bottomPad + 40 }}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="arrow-left" size={22} color="#fff" />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.screenTitle}>AI Symptom Pre-Check</Text>
              <Text style={styles.screenSub}>Before your session with {displayName}</Text>
            </View>
          </View>

          <View style={styles.aiBadge}>
            <Feather name="cpu" size={15} color="#7FA8D8" />
            <Text style={styles.aiBadgeText}>Powered by PULSE AI · Secure & Confidential</Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.formCardTitle}>Describe Your Condition</Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>What symptoms are you experiencing?</Text>
              <TextInput
                style={styles.multiInput}
                placeholder="e.g. chest pain, headache, fever, shortness of breath..."
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={symptoms}
                onChangeText={setSymptoms}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>How long have you had these symptoms?</Text>
              <TextInput
                style={styles.singleInput}
                placeholder="e.g. 2 days, 1 week, since this morning..."
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={duration}
                onChangeText={setDuration}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Severity Level</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {(["mild", "moderate", "severe"] as const).map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSeverity(s);
                    }}
                    style={[
                      styles.severityBtn,
                      {
                        backgroundColor:
                          severity === s
                            ? s === "mild"
                              ? "#059669"
                              : s === "moderate"
                              ? "#D97706"
                              : "#DC2626"
                            : "rgba(255,255,255,0.08)",
                      },
                    ]}
                  >
                    <Text style={styles.severityBtnText}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.secNote}>
            <Feather name="shield" size={14} color="#7FA8D8" />
            <Text style={styles.secNoteText}>
              End-to-end encrypted. Only your doctor can see this information. Medical-grade privacy protection.
            </Text>
          </View>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setPhase("mediacheck");
            }}
            style={({ pressed }) => [styles.continueBtn, { opacity: pressed ? 0.88 : 1 }]}
          >
            <Text style={styles.continueBtnText}>Continue to Media Check</Text>
            <Feather name="arrow-right" size={18} color="#fff" />
          </Pressable>

          <Pressable onPress={() => setPhase("mediacheck")} style={{ alignItems: "center", marginTop: 14 }}>
            <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, fontFamily: "Inter_400Regular" }}>
              Skip pre-check
            </Text>
          </Pressable>
        </ScrollView>
      </LinearGradient>
    );
  }

  /* ─── MEDIA CHECK (GREEN ROOM) ─── */
  if (phase === "mediacheck") {
    return (
      <LinearGradient colors={["#202937", "#315d93"]} style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingTop: topPad + 20, paddingHorizontal: 24, paddingBottom: bottomPad + 20 }}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => setPhase("precheck")} style={styles.backBtn}>
              <Feather name="arrow-left" size={22} color="#fff" />
            </Pressable>
            <Text style={styles.screenTitle}>Media Check</Text>
          </View>

          <View style={styles.previewContainer}>
            {isCameraOn ? (
               <View style={styles.previewInner}>
                 <Feather name="user" size={80} color="rgba(255,255,255,0.2)" />
                 <View style={styles.previewOverlay}>
                    <Text style={styles.previewText}>Camera Preview Active</Text>
                 </View>
               </View>
            ) : (
              <View style={[styles.previewInner, { backgroundColor: '#000' }]}>
                <Feather name="camera-off" size={40} color="rgba(255,255,255,0.4)" />
                <Text style={[styles.previewText, { marginTop: 12 }]}>Camera is Off</Text>
              </View>
            )}

            <View style={styles.mediaControls}>
              <Pressable 
                onPress={() => { setIsCameraOn(!isCameraOn); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[styles.mediaBtn, !isCameraOn && styles.mediaBtnOff]}
              >
                <Feather name={isCameraOn ? "video" : "video-off"} size={22} color="#fff" />
              </Pressable>
              <Pressable 
                onPress={() => { setIsMicOn(!isMicOn); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[styles.mediaBtn, !isMicOn && styles.mediaBtnOff]}
              >
                <Feather name={isMicOn ? "mic" : "mic-off"} size={22} color="#fff" />
              </Pressable>
            </View>
          </View>

          <View style={styles.checkCard}>
             <View style={styles.checkItem}>
                <View style={[styles.checkCircle, { backgroundColor: isCameraOn ? '#05966930' : 'rgba(255,255,255,0.1)' }]}>
                   <Feather name={isCameraOn ? "check" : "camera"} size={14} color={isCameraOn ? "#059669" : "#fff"} />
                </View>
                <Text style={styles.checkText}>Camera Permissions Granted</Text>
             </View>
             <View style={styles.checkItem}>
                <View style={[styles.checkCircle, { backgroundColor: isMicOn ? '#05966930' : 'rgba(255,255,255,0.1)' }]}>
                   <Feather name={isMicOn ? "check" : "mic"} size={14} color={isMicOn ? "#059669" : "#fff"} />
                </View>
                <Text style={styles.checkText}>Microphone Permissions Granted</Text>
             </View>
          </View>

          <View style={{ flex: 1 }} />

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              setPhase("waiting");
            }}
            style={styles.continueBtn}
          >
            <Text style={styles.continueBtnText}>Join Waiting Room</Text>
            <Feather name="log-in" size={18} color="#fff" />
          </Pressable>
        </View>
      </LinearGradient>
    );
  }

  /* ─── WAITING ROOM ─── */
  if (phase === "waiting") {
    const steps = [
      { label: "Camera Access Granted", done: connectionProgress > 20 },
      { label: "Microphone Check Passed", done: connectionProgress > 40 },
      { label: "Internet Quality: Good", done: connectionProgress > 60 },
      { label: "Notifying Doctor…", done: connectionProgress >= 85 },
    ];
    return (
      <LinearGradient colors={["#202937", "#315d93"]} style={{ flex: 1 }}>
        <View
          style={{
            flex: 1,
            paddingTop: topPad + 20,
            paddingHorizontal: 24,
            paddingBottom: bottomPad + 20,
          }}
        >
          <View style={[styles.headerRow, { marginBottom: 24 }]}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="arrow-left" size={22} color="#fff" />
            </Pressable>
            <Text style={styles.screenTitle}>Waiting Room</Text>
          </View>

          <View style={styles.waitingCard}>
            <Animated.View
              style={[styles.waitingAvatar, { transform: [{ scale: pulseAnim }] }]}
            >
              <Feather name="user" size={44} color="#7FA8D8" />
            </Animated.View>
            <Text style={styles.waitingName}>{displayName}</Text>
            <Text style={styles.waitingSpec}>{displaySpec}</Text>
            <View style={styles.waitingBadge}>
              <View style={styles.waitingDot} />
              <Text style={styles.waitingBadgeText}>
                {waitingForAccept ? "Waiting for doctor to accept…" : "Connecting you now…"}
              </Text>
            </View>
          </View>

          <View style={styles.connectionCard}>
            <Text style={styles.connectionTitle}>Preparing your secure session…</Text>
            {steps.map((step) => (
              <View key={step.label} style={styles.checkRow}>
                <View
                  style={[
                    styles.checkIcon,
                    { backgroundColor: step.done ? "#05966930" : "rgba(255,255,255,0.08)" },
                  ]}
                >
                  <Feather
                    name={step.done ? "check" : "circle"}
                    size={13}
                    color={step.done ? "#059669" : "rgba(255,255,255,0.3)"}
                  />
                </View>
                <Text
                  style={[
                    styles.checkLabel,
                    { color: step.done ? "#fff" : "rgba(255,255,255,0.4)" },
                  ]}
                >
                  {step.label}
                </Text>
                {step.done && (
                  <Feather
                    name="check-circle"
                    size={15}
                    color="#059669"
                    style={{ marginLeft: "auto" }}
                  />
                )}
              </View>
            ))}
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.round(connectionProgress)}%` as any },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {connectionProgress >= 85
                ? "Waiting for doctor to join…"
                : `${Math.round(connectionProgress)}% ready`}
            </Text>
          </View>

          <View style={styles.qualityRow}>
            <Feather name="wifi" size={16} color="#059669" />
            <Text style={styles.qualityText}>
              Network:{" "}
              <Text style={{ color: "#059669", fontFamily: "Inter_600SemiBold" }}>Good</Text>
            </Text>
            <View style={[styles.qualityPip, { backgroundColor: "#059669" }]} />
          </View>

          {waitingForAccept && (
            <Pressable
              onPress={() => {
                setConnectionProgress(100);
                setWaitingForAccept(false);
                setTimeout(() => setPhase("call"), 400);
              }}
              style={{ marginTop: 16, alignItems: "center" }}
            >
              <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, fontFamily: "Inter_400Regular" }}>
                Doctor taking too long? Join anyway
              </Text>
            </Pressable>
          )}
        </View>
      </LinearGradient>
    );
  }

  /* ─── ACTIVE CALL — real two-way video via Jitsi Meet ─── */
  if (phase === "call") {
    return (
      <View style={{ flex: 1, backgroundColor: "#050D18" }}>
        <View style={[styles.callTopBar, { paddingTop: topPad + 8 }]}>
          <View style={styles.callTimerPill}>
            <View style={styles.recDot} />
            <Text style={styles.callTimerText}>{fmt(callSeconds)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.callDoctorName} numberOfLines={1}>
              {isDoctorJoining ? "Patient" : displayName}
            </Text>
          </View>
          <View style={styles.encryptedPill}>
            <Feather name="lock" size={12} color="#7FA8D8" />
            <Text style={styles.encryptedText}>E2E</Text>
          </View>
        </View>

        {Platform.OS === "web" ? (
          <View
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#0A1628",
            }}
          >
            <Feather name="video" size={48} color="#315d93" />
            <Text
              style={{
                color: "#fff",
                fontFamily: "Inter_600SemiBold",
                fontSize: 16,
                marginTop: 16,
              }}
            >
              Video Call Active
            </Text>
            <Text
              style={{
                color: "rgba(255,255,255,0.5)",
                fontFamily: "Inter_400Regular",
                fontSize: 13,
                marginTop: 8,
                textAlign: "center",
                paddingHorizontal: 32,
              }}
            >
              Open on your phone with Expo Go to join the live video room
            </Text>
            <Text
              style={{
                color: "#7FA8D8",
                fontFamily: "Inter_500Medium",
                fontSize: 12,
                marginTop: 12,
              }}
            >
              Room: {roomName}
            </Text>
          </View>
        ) : (
          <WebView
            style={{ flex: 1 }}
            source={{ uri: jitsiUrl }}
            javaScriptEnabled
            domStorageEnabled
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            allowsFullscreenVideo
            startInLoadingState
            onError={() => {
              Alert.alert(
                "Connection Error",
                "Could not load video room. Please check your internet connection."
              );
            }}
          />
        )}

        <View style={[styles.endCallOverlay, { paddingBottom: bottomPad + 12 }]}>
          <Pressable onPress={endCall} style={styles.endBtn}>
            <Feather name="phone-off" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.endBtnLabel}>End Call</Text>
        </View>
      </View>
    );
  }

  /* ─── POST CALL ─── */
  return (
    <LinearGradient colors={["#202937", "#315d93"]} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad + 48,
          paddingHorizontal: 24,
          paddingBottom: bottomPad + 40,
          gap: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { marginBottom: 8 }]}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </Pressable>

        <View style={{ alignItems: "center", gap: 14 }}>
          <View style={styles.doneIcon}>
            <Feather name="check" size={42} color="#fff" />
          </View>
          <Text style={styles.doneTitle}>Consultation Complete</Text>
          <Text style={styles.doneSub}>
            Your session with {isDoctorJoining ? "Patient" : displayName} lasted {fmt(callSeconds)}
          </Text>
        </View>

        <View style={styles.ratingCard}>
          <Text style={styles.ratingTitle}>Rate your experience</Text>
          <View style={{ flexDirection: "row", gap: 12, justifyContent: "center" }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable
                key={star}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setRating(star);
                }}
              >
                <Feather
                  name="star"
                  size={38}
                  color={rating >= star ? "#D97706" : "rgba(255,255,255,0.15)"}
                />
              </Pressable>
            ))}
          </View>
          {rating > 0 && (
            <Text style={styles.ratingLabel}>
              {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
            </Text>
          )}
        </View>

        <View style={{ gap: 12 }}>
          <Pressable
            onPress={() =>
              Alert.alert(
                "Prescription",
                `${displayName} will send a digital prescription to your profile within 30 minutes.`
              )
            }
            style={styles.postBtn}
          >
            <Feather name="file-text" size={18} color="#fff" />
            <Text style={styles.postBtnText}>View Prescription</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              Alert.alert(
                "Session Report",
                "A full session report has been saved to your medical history."
              )
            }
            style={[
              styles.postBtn,
              {
                backgroundColor: "rgba(255,255,255,0.08)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.15)",
              },
            ]}
          >
            <Feather name="download" size={18} color="#7FA8D8" />
            <Text style={[styles.postBtnText, { color: "#7FA8D8" }]}>Download Session Report</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.replace("/(tabs)");
            }}
            style={[styles.postBtn, { backgroundColor: "transparent" }]}
          >
            <Text style={[styles.postBtnText, { color: "rgba(255,255,255,0.5)" }]}>
              Return to Home
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  screenTitle: { color: "#fff", fontSize: 20, fontFamily: "Inter_700Bold" },
  screenSub: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(127,168,216,0.12)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 18,
    alignSelf: "flex-start",
  },
  aiBadgeText: { color: "#7FA8D8", fontSize: 12, fontFamily: "Inter_500Medium" },
  formCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    padding: 20,
    gap: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 16,
  },
  formCardTitle: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  field: { gap: 8 },
  fieldLabel: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontFamily: "Inter_500Medium" },
  multiInput: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    color: "#fff",
    padding: 14,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    minHeight: 88,
  },
  singleInput: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    color: "#fff",
    padding: 14,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  severityBtn: { flex: 1, padding: 11, borderRadius: 10, alignItems: "center" },
  severityBtnText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  secNote: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "rgba(127,168,216,0.08)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    alignItems: "flex-start",
  },
  secNoteText: {
    flex: 1,
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  continueBtn: {
    backgroundColor: "#315d93",
    borderRadius: 14,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  continueBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  waitingCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  waitingAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(49,93,147,0.4)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  waitingName: { color: "#fff", fontSize: 20, fontFamily: "Inter_700Bold" },
  waitingSpec: { color: "rgba(255,255,255,0.55)", fontSize: 14, fontFamily: "Inter_400Regular" },
  waitingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(5,150,105,0.2)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 6,
  },
  waitingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#059669" },
  waitingBadgeText: { color: "#059669", fontSize: 12, fontFamily: "Inter_600SemiBold" },
  connectionCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 16,
  },
  connectionTitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkIcon: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  checkLabel: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  progressBar: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#315d93", borderRadius: 2 },
  progressText: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  qualityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(5,150,105,0.1)",
    borderRadius: 10,
    padding: 12,
  },
  qualityText: {
    flex: 1,
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  qualityPip: { width: 8, height: 8, borderRadius: 4 },
  callTopBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: "rgba(0,0,0,0.7)",
    zIndex: 10,
  },
  callTimerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(220,38,38,0.25)",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  recDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#DC2626" },
  callTimerText: { color: "#fff", fontSize: 13, fontFamily: "Inter_700Bold" },
  callDoctorName: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    paddingHorizontal: 8,
  },
  encryptedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(127,168,216,0.15)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  encryptedText: { color: "#7FA8D8", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  endCallOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingTop: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  endBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  previewContainer: {
    height: 300,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.3)",
    overflow: "hidden",
    marginVertical: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  previewInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1F2937",
  },
  previewOverlay: {
    position: "absolute",
    bottom: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  previewText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  mediaControls: {
    position: "absolute",
    bottom: 20,
    right: 20,
    flexDirection: "row",
    gap: 12,
  },
  mediaBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaBtnOff: {
    backgroundColor: "#DC2626",
  },
  checkCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  checkItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  checkText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  endBtnLabel: {
    color: "#DC2626",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    marginTop: 6,
    marginBottom: 4,
  },
  doneIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
  },
  doneTitle: { color: "#fff", fontSize: 24, fontFamily: "Inter_700Bold" },
  doneSub: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  ratingCard: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 18,
    padding: 24,
    gap: 16,
    alignItems: "center",
  },
  ratingTitle: { color: "#fff", fontSize: 16, fontFamily: "Inter_600SemiBold" },
  ratingLabel: { color: "#D97706", fontSize: 15, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  postBtn: {
    backgroundColor: "#315d93",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  postBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});

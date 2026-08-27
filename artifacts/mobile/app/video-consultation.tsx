import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions, useMicrophonePermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  createVideoSession,
  endVideoSession,
  type VideoSession,
} from "@workspace/api-client-react";
import { useApp } from "@/context/AppContext";
import { createCall, subscribeToCallStatus, updateCallStatus } from "@/services/callService";
import { supabase } from "@/lib/supabase";

type Phase = "checking" | "precheck" | "media" | "waiting" | "joining" | "call" | "finished";
const isEligible = (appointment: any) =>
  appointment?.paymentStatus === "verified" &&
  ["scheduled", "accepted", "confirmed"].includes(appointment?.status) &&
  ["video", "online", "video consultation"].includes(String(appointment?.serviceType ?? appointment?.service_type ?? "").toLowerCase());

function escapeScriptJson(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

function zegoDocument(session: VideoSession, cameraOn: boolean, micOn: boolean) {
  const config = escapeScriptJson(session);
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>html,body,#root{width:100%;height:100%;margin:0;overflow:hidden;background:#050d18}</style></head><body><div id="root"></div><script src="https://unpkg.com/@zegocloud/zego-uikit-prebuilt@2.18.3/zego-uikit-prebuilt.js" integrity="sha256-ake8Hpsy0FBbr8W2u9f6hKbRew5aiiHZXGOAlfSV6zM=" crossorigin="anonymous"></script><script>
const session=${config};
const send=(type,detail={})=>window.ReactNativeWebView?window.ReactNativeWebView.postMessage(JSON.stringify({type,sessionId:session.sessionId,...detail})):window.parent.postMessage({type,sessionId:session.sessionId,...detail},"*");
try {
 const kitToken=ZegoUIKitPrebuilt.generateKitTokenForProduction(session.appId,session.token,session.roomId,session.userId,session.userName);
 const zp=ZegoUIKitPrebuilt.create(kitToken);
 send("sdk-ready");
 zp.joinRoom({container:document.getElementById("root"),scenario:{mode:ZegoUIKitPrebuilt.OneONoneCall},showPreJoinView:false,turnOnCameraWhenJoining:${cameraOn},turnOnMicrophoneWhenJoining:${micOn},maxUsers:2,onLeaveRoom:()=>send("leave")});
 send("joined");
} catch (error) { send("error",{message:"Unable to join the video room."}); }
</script></body></html>`;
}

export default function VideoConsultationScreen() {
  const params = useLocalSearchParams<{ appointmentId?: string; doctorId?: string; doctorName?: string; specialty?: string; isDoctor?: string; callId?: string }>();
  const appointmentId = Array.isArray(params.appointmentId) ? params.appointmentId[0] : params.appointmentId;
  const doctorId = Array.isArray(params.doctorId) ? params.doctorId[0] : params.doctorId;
  const callIdParam = Array.isArray(params.callId) ? params.callId[0] : params.callId;
  const isDoctor = params.isDoctor === "true";
  const { user } = useApp();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>("checking");
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<VideoSession | null>(null);
  const [callId, setCallId] = useState<string | undefined>(callIdParam);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [cameraPermission, requestCamera] = useCameraPermissions();
  const [microphonePermission, requestMicrophone] = useMicrophonePermissions();
  const ended = useRef(false);

  useEffect(() => {
    if (!appointmentId || !user?.id) { setError("A verified video appointment is required."); setPhase("finished"); return; }
    const check = async (row?: any) => {
      let appointment = row;
      if (!appointment) {
        const { data } = await supabase.from("appointments").select("*").eq("id", appointmentId).maybeSingle();
        appointment = data;
      }
      if (!isEligible(appointment)) { setError("This appointment is not currently eligible for video consultation."); setPhase("finished"); }
      else setPhase(isDoctor ? "media" : "precheck");
    };
    void check();
    const channel = supabase.channel(`video-appointment-${appointmentId}`).on("postgres_changes",
      { event: "UPDATE", schema: "public", table: "appointments", filter: `id=eq.${appointmentId}` },
      ({ new: row }) => { if (!isEligible(row)) { setError("The appointment is no longer eligible. Video access has been locked."); setPhase("finished"); } },
    ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [appointmentId, user?.id, isDoctor]);

  const requestMedia = async () => {
    const [camera, microphone] = await Promise.all([cameraPermission?.granted ? Promise.resolve(cameraPermission) : requestCamera(), microphonePermission?.granted ? Promise.resolve(microphonePermission) : requestMicrophone()]);
    return Boolean(camera?.granted && microphone?.granted);
  };
  const startSession = useCallback(async (acceptedCallId?: string) => {
    if (!appointmentId) return;
    setError(null); setPhase("joining");
    try {
      const body = await createVideoSession({
        appointmentId,
        ...((acceptedCallId ?? callId) ? { callId: acceptedCallId ?? callId } : {}),
      });
      setSession(body);
      setPhase("call");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to start the video session."); setPhase("media"); }
  }, [appointmentId, callId]);
  const inviteProvider = useCallback(async () => {
    if (!appointmentId || !user?.id) return;
    setPhase("waiting"); setError(null);
    try {
      const call = await createCall(appointmentId);
      setCallId(call.id);
      if (call.status === "accepted") {
        void startSession(call.id);
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to notify the provider."); setPhase("media"); }
  }, [appointmentId, user?.id, startSession]);
  useEffect(() => {
    if (!callId) return;
    const channel = subscribeToCallStatus(callId, (updated) => {
      if (updated.status === "accepted" && phase === "waiting") {
        void startSession(callId);
      } else if (updated.status === "rejected") {
        setError("The provider declined this consultation.");
        setPhase("media");
      } else if (updated.status === "ended" && phase !== "finished") {
        ended.current = true;
        setSession(null);
        setError(null);
        setPhase("finished");
      }
    });
    return () => { supabase.removeChannel(channel); };
  }, [callId, phase, startSession]);
  const endSession = useCallback(async () => {
    if (ended.current) return;
    ended.current = true;
    if (callId) await updateCallStatus(callId, "ended").catch(() => {});
    if (session) {
      await endVideoSession(session.sessionId).catch(() => {});
    }
    setPhase("finished");
  }, [callId, session]);
  const handleSdkMessage = useCallback((event: any) => {
    try {
      const message = JSON.parse(event?.nativeEvent?.data ?? event?.data ?? "");
      if (!session || message.sessionId !== session.sessionId) return;
      if (message.type === "leave") void endSession();
      if (message.type === "error") setError(message.message || "Unable to join the video room.");
      // sdk-ready and joined are intentionally consumed: the embedded SDK owns
      // media rendering while React Native retains the visible end control.
    } catch {
      // Ignore messages not emitted by the consultation document.
    }
  }, [endSession, session]);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const listener = (event: MessageEvent) => handleSdkMessage(event);
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [handleSdkMessage]);

  if (phase === "checking") return <LinearGradient colors={["#202937", "#315d93"]} style={styles.center}><Text style={styles.white}>Checking appointment access…</Text></LinearGradient>;
  if (phase === "finished") return <LinearGradient colors={["#202937", "#315d93"]} style={styles.center}><Feather name={error ? "lock" : "check-circle"} size={48} color="#7FA8D8" /><Text style={styles.title}>{error ? "Video Session Locked" : "Consultation ended"}</Text><Text style={styles.sub}>{error ?? "You may return to your appointments."}</Text><Pressable testID="video-return" onPress={() => router.back()} style={styles.button}><Text style={styles.white}>Return</Text></Pressable></LinearGradient>;
  if (phase === "precheck") return <LinearGradient colors={["#202937", "#315d93"]} style={styles.center}><Feather name="clipboard" size={42} color="#7FA8D8" /><Text style={styles.title}>Consultation pre-check</Text><Text style={styles.sub}>Prepare your camera and microphone before joining your appointment.</Text><Pressable testID="video-precheck-continue" onPress={() => setPhase("media")} style={styles.button}><Text style={styles.white}>Continue</Text></Pressable></LinearGradient>;
  if (phase === "waiting") return <LinearGradient colors={["#202937", "#315d93"]} style={styles.center}><Feather name="clock" size={48} color="#7FA8D8" /><Text style={styles.title}>Waiting for provider</Text><Text style={styles.sub}>Your appointment-bound invitation has been sent.</Text><Pressable testID="video-end-waiting" onPress={endSession} style={styles.secondary}><Text style={styles.white}>Cancel</Text></Pressable></LinearGradient>;
  if (phase === "media") return <LinearGradient colors={["#202937", "#315d93"]} style={styles.center}>{Platform.OS !== "web" && cameraOn && cameraPermission?.granted ? <CameraView style={styles.preview} facing="front" /> : <Feather name="video" size={52} color="#7FA8D8" />}<Text style={styles.title}>Media check</Text><Text style={styles.sub}>{error ?? "Allow camera and microphone access to join."}</Text><View style={styles.row}><Pressable onPress={() => setCameraOn(!cameraOn)} style={styles.icon}><Feather name={cameraOn ? "video" : "video-off"} size={20} color="#fff" /></Pressable><Pressable onPress={() => setMicOn(!micOn)} style={styles.icon}><Feather name={micOn ? "mic" : "mic-off"} size={20} color="#fff" /></Pressable></View><Pressable testID="video-join" onPress={async () => { if (await requestMedia()) isDoctor ? void startSession() : void inviteProvider(); else Alert.alert("Permissions required", "Allow camera and microphone access to join."); }} style={styles.button}><Text style={styles.white}>{isDoctor ? "Join consultation" : "Notify provider"}</Text></Pressable>{error && <Pressable testID="video-retry" onPress={() => isDoctor ? void startSession() : void inviteProvider()} style={styles.secondary}><Text style={styles.white}>Retry</Text></Pressable>}</LinearGradient>;
  if (phase === "joining") return <LinearGradient colors={["#202937", "#315d93"]} style={styles.center}><Text style={styles.white}>Creating secure video session…</Text></LinearGradient>;
  const html = session ? zegoDocument(session, cameraOn, micOn) : "";
  return <View style={{ flex: 1, backgroundColor: "#050d18", paddingTop: insets.top }}>
    {Platform.OS === "web" ? React.createElement("iframe", { srcDoc: html, title: "Pulse video consultation", allow: "camera; microphone; autoplay; display-capture", style: { border: 0, flex: 1, width: "100%" }, onLoad: undefined }) : <WebView source={{ html }} style={{ flex: 1 }} javaScriptEnabled domStorageEnabled allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false} mediaCapturePermissionGrantType="grant" onMessage={handleSdkMessage} onError={() => setError("Unable to load the video room. Please retry.")} />}
    <Pressable testID="video-end" onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); void endSession(); }} style={styles.end}><Feather name="phone-off" size={22} color="#fff" /><Text style={styles.white}>End call</Text></Pressable>
    {error && <Pressable testID="video-retry" onPress={() => void startSession()} style={styles.retry}><Text style={styles.white}>Retry connection</Text></Pressable>}
  </View>;
}

const styles = StyleSheet.create({ center:{flex:1,alignItems:"center",justifyContent:"center",padding:28,gap:16}, white:{color:"#fff",fontFamily:"Inter_600SemiBold"}, title:{color:"#fff",fontSize:23,fontFamily:"Inter_700Bold",textAlign:"center"}, sub:{color:"rgba(255,255,255,.65)",fontSize:14,fontFamily:"Inter_400Regular",textAlign:"center",lineHeight:21}, button:{backgroundColor:"#315d93",paddingHorizontal:24,paddingVertical:15,borderRadius:13,marginTop:8}, secondary:{backgroundColor:"rgba(255,255,255,.12)",paddingHorizontal:24,paddingVertical:13,borderRadius:13}, row:{flexDirection:"row",gap:14}, icon:{width:48,height:48,borderRadius:24,backgroundColor:"rgba(255,255,255,.15)",alignItems:"center",justifyContent:"center"}, preview:{width:210,height:150,borderRadius:16,overflow:"hidden"}, end:{position:"absolute",bottom:28,alignSelf:"center",backgroundColor:"#DC2626",paddingHorizontal:20,paddingVertical:13,borderRadius:24,flexDirection:"row",gap:8,alignItems:"center"}, retry:{position:"absolute",top:20,alignSelf:"center",backgroundColor:"#315d93",padding:10,borderRadius:10} });
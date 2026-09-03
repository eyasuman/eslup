import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

const PULSE_LOGO = require("../assets/images/pulse-logo.jpg");

interface Props {
  onFinish: () => void;
}

export function SplashAnimation({ onFinish }: Props) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.75)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(20)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // 1. Logo fades in + scales up
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
      ]),
      // 2. Short pause
      Animated.delay(200),
      // 3. PULSE text rises up + fades in
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),
        Animated.timing(textTranslateY, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }),
      ]),
      // 4. Tagline fades in
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      // 5. Hold
      Animated.delay(900),
      // 6. Fade entire screen out
      Animated.timing(screenOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onFinish();
    });
  }, []);

  return (
    <Animated.View style={[styles.root, { opacity: screenOpacity }]}>
      <LinearGradient
        colors={["#202937", "#2a4a7a", "#315d93"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      />

      {/* Subtle ring decorations */}
      <View style={[styles.ring, styles.ringOuter]} />
      <View style={[styles.ring, styles.ringMiddle]} />

      {/* Logo */}
      <Animated.View
        style={[
          styles.logoWrap,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image source={PULSE_LOGO} style={styles.logo} resizeMode="cover" />
      </Animated.View>

      {/* Text block */}
      <Animated.View
        style={[
          styles.textBlock,
          {
            opacity: textOpacity,
            transform: [{ translateY: textTranslateY }],
          },
        ]}
      >
        <Text style={styles.pulseText}>PULSE</Text>
        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          HEALTH-TECH SOLUTION
        </Animated.Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  ring: {
    position: "absolute",
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  ringOuter: {
    width: width * 1.1,
    height: width * 1.1,
    top: height / 2 - width * 0.55,
    left: -width * 0.05,
  },
  ringMiddle: {
    width: width * 0.75,
    height: width * 0.75,
    top: height / 2 - width * 0.375,
    left: width * 0.125,
  },
  logoWrap: {
    width: 110,
    height: 110,
    borderRadius: 55,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 16,
    marginBottom: 28,
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.18)",
  },
  logo: {
    width: "100%",
    height: "100%",
  },
  textBlock: {
    alignItems: "center",
    gap: 8,
  },
  pulseText: {
    fontSize: 46,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: 12,
    includeFontPadding: false,
  },
  tagline: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.65)",
    letterSpacing: 4,
  },
});

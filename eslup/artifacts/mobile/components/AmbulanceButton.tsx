import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from "react-native";

interface AmbulanceButtonProps {
  visible?: boolean;
}

export function AmbulanceButton({ visible = true }: AmbulanceButtonProps) {
  const scale1 = useRef(new Animated.Value(1)).current;
  const opacity1 = useRef(new Animated.Value(0.7)).current;
  const scale2 = useRef(new Animated.Value(1)).current;
  const opacity2 = useRef(new Animated.Value(0.5)).current;
  const scale3 = useRef(new Animated.Value(1)).current;
  const opacity3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = (scaleAnim: Animated.Value, opacityAnim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scaleAnim, {
              toValue: 1.6,
              duration: 1500,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0,
              duration: 1500,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(scaleAnim, { toValue: 1, duration: 0, useNativeDriver: true }),
            Animated.timing(opacityAnim, { toValue: delay === 0 ? 0.7 : delay === 300 ? 0.5 : 0.3, duration: 0, useNativeDriver: true }),
          ]),
        ])
      );

    const a1 = pulse(scale1, opacity1, 0);
    const a2 = pulse(scale2, opacity2, 300);
    const a3 = pulse(scale3, opacity3, 600);
    a1.start();
    a2.start();
    a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  if (!visible) return null;

  const bottom = Platform.OS === "web" ? 100 : 96;

  return (
    <View style={[styles.container, { bottom }]}>
      <Animated.View style={[styles.ring, { transform: [{ scale: scale3 }], opacity: opacity3 }]} />
      <Animated.View style={[styles.ring, { transform: [{ scale: scale2 }], opacity: opacity2 }]} />
      <Animated.View style={[styles.ring, { transform: [{ scale: scale1 }], opacity: opacity1 }]} />
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          router.push("/urgent-care");
        }}
        style={({ pressed }) => [styles.button, { opacity: pressed ? 0.9 : 1 }]}
      >
        <Text style={styles.text}>Need an{"\n"}Ambulance?</Text>
      </Pressable>
    </View>
  );
}

const SIZE = 88;

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 20,
    zIndex: 9999,
    alignItems: "center",
    justifyContent: "center",
    width: SIZE,
    height: SIZE,
  },
  ring: {
    position: "absolute",
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: "#DC2626",
  },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
  },
  text: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    lineHeight: 16,
  },
});

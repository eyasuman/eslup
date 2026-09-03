import React from "react";
import {
  Modal,
  View,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";

export interface ImageViewerModalProps {
  visible: boolean;
  uri?: string | null;
  onClose: () => void;
}

export function ImageViewerModal({ visible, uri, onClose }: ImageViewerModalProps) {
  const insets = useSafeAreaInsets();
  if (!uri) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <Pressable
          onPress={onClose}
          style={[styles.closeBtn, { top: insets.top + 12 }]}
        >
          <Feather name="x" size={22} color="#fff" />
        </Pressable>

        <Image source={{ uri }} style={styles.image} contentFit="contain" />

        <Text style={[styles.hint, { bottom: insets.bottom + 12 }]}>
          Tap the X to close
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  closeBtn: {
    position: "absolute",
    right: 16,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  hint: {
    position: "absolute",
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
  },
});

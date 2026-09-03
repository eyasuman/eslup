import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  Alert,
  Modal,
  ScrollView,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useColors } from "@/hooks/useColors";
import { useData, Banner, BannerType } from "@/context/DataContext";

const TYPE_META: Record<BannerType, { color: string; icon: any; label: string }> = {
  photo: { color: "#818cf8", icon: "image", label: "Photo" },
  image: { color: "#818cf8", icon: "image", label: "Image" },
  promo: { color: "#f59e0b", icon: "tag", label: "Promo" },
  alert: { color: "#ef4444", icon: "alert-triangle", label: "Alert" },
  info: { color: "#10b981", icon: "info", label: "Info" },
};

export default function BannersScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { banners, addBanner, toggleBanner, deleteBanner, uploadBannerImage } = useData();

  const [showAddModal, setShowAddModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");

  const filtered = banners
    .filter((b) => {
      if (activeFilter === "active") return b.isActive;
      if (activeFilter === "inactive") return !b.isActive;
      return true;
    })
    .sort((a, b) => a.priority - b.priority);

  const activeCt = banners.filter((b) => b.isActive).length;

  const topPt = Platform.OS === "web" ? 67 + 16 : insets.top + 16;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPt, backgroundColor: colors.background }]}>
        <View style={styles.titleRow}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Feather name="arrow-left" size={16} color={colors.foreground} />
          </Pressable>
          <View style={styles.titleGroup}>
            <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>ADMIN</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Banners</Text>
          </View>
          <Pressable
            onPress={() => setShowAddModal(true)}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="plus" size={16} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <SummaryPill label="Total" value={banners.length} color={colors.primary} colors={colors} />
          <SummaryPill label="Active" value={activeCt} color="#10b981" colors={colors} />
          <SummaryPill label="Inactive" value={banners.length - activeCt} color="#94a3b8" colors={colors} />
        </View>

        <View style={styles.filterRow}>
          {(["all", "active", "inactive"] as const).map((f) => (
            <Pressable
              key={f}
              onPress={() => setActiveFilter(f)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: activeFilter === f ? colors.primary : colors.card,
                  borderColor: activeFilter === f ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.filterLabel, { color: activeFilter === f ? "#fff" : colors.mutedForeground }]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(b) => b.id}
        renderItem={({ item }) => (
          <BannerCard
            banner={item}
            colors={colors}
            onToggle={() => toggleBanner(item.id)}
            onDelete={() =>
              Alert.alert("Delete Banner", `Delete "${item.title}"?`, [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => deleteBanner(item.id) },
              ])
            }
          />
        )}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 24 : 30) },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="image" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No banners yet</Text>
            <Pressable
              onPress={() => setShowAddModal(true)}
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
            >
              <Feather name="plus" size={14} color="#fff" />
              <Text style={styles.emptyBtnText}>Create First Banner</Text>
            </Pressable>
          </View>
        }
      />

      <AddBannerModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={addBanner}
        onUploadImage={uploadBannerImage}
        colors={colors}
      />
    </View>
  );
}

function BannerCard({
  banner,
  colors,
  onToggle,
  onDelete,
}: {
  banner: Banner;
  colors: any;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const meta = TYPE_META[banner.type] ?? TYPE_META.info;

  return (
    <View
      style={[
        cardStyles.card,
        {
          backgroundColor: colors.card,
          borderColor: banner.isActive ? meta.color + "40" : colors.border,
          borderLeftWidth: banner.isActive ? 3 : 1,
          borderLeftColor: banner.isActive ? meta.color : colors.border,
        },
      ]}
    >
      {banner.imageUrl ? (
        <Image source={{ uri: banner.imageUrl }} style={cardStyles.image} contentFit="cover" />
      ) : null}
      <View style={cardStyles.header}>
        <View style={[cardStyles.typeIcon, { backgroundColor: meta.color + "15", borderColor: meta.color + "25" }]}>
          <Feather name={meta.icon} size={14} color={meta.color} />
        </View>
        <View style={cardStyles.headerMid}>
          <Text style={[cardStyles.bannerTitle, { color: colors.foreground }]} numberOfLines={1}>
            {banner.title}
          </Text>
          <View style={cardStyles.metaRow}>
            <View style={[cardStyles.typeBadge, { backgroundColor: meta.color + "12", borderColor: meta.color + "25" }]}>
              <Text style={[cardStyles.typeBadgeText, { color: meta.color }]}>{meta.label.toUpperCase()}</Text>
            </View>
            <View style={[cardStyles.audienceBadge, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="users" size={9} color={colors.mutedForeground} />
              <Text style={[cardStyles.audienceText, { color: colors.mutedForeground }]}>{banner.targetAudience ?? "All"}</Text>
            </View>
          </View>
        </View>
        <Switch
          value={banner.isActive}
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: colors.primary + "88" }}
          thumbColor={banner.isActive ? colors.primary : colors.mutedForeground}
          ios_backgroundColor={colors.border}
        />
      </View>

      <Text style={[cardStyles.message, { color: colors.mutedForeground }]} numberOfLines={2}>
        {banner.message}
      </Text>

      <View style={[cardStyles.footer, { borderTopColor: colors.border }]}>
        <View style={cardStyles.footerLeft}>
          <View style={[cardStyles.priorityBadge, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="arrow-up" size={9} color={colors.mutedForeground} />
            <Text style={[cardStyles.priorityText, { color: colors.mutedForeground }]}>Priority {banner.priority}</Text>
          </View>
          {banner.promoCode && (
            <View style={[cardStyles.promoBadge, { backgroundColor: "#f59e0b15", borderColor: "#f59e0b25" }]}>
              <Feather name="tag" size={9} color="#f59e0b" />
              <Text style={[cardStyles.promoText, { color: "#f59e0b" }]}>{banner.promoCode}</Text>
            </View>
          )}
          <Text style={[cardStyles.durationText, { color: colors.mutedForeground }]}>
            {banner.displayDuration}s display
          </Text>
        </View>
        <Pressable onPress={onDelete} style={[cardStyles.deleteBtn, { backgroundColor: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.2)" }]}>
          <Feather name="trash-2" size={13} color="#ef4444" />
        </Pressable>
      </View>
    </View>
  );
}

function SummaryPill({ label, value, color, colors }: any) {
  return (
    <View style={[summaryStyles.pill, { flex: 1, backgroundColor: color + "10", borderColor: color + "22" }]}>
      <Text style={[summaryStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[summaryStyles.value, { color }]}>{value}</Text>
    </View>
  );
}

function AddBannerModal({ visible, onClose, onAdd, onUploadImage, colors }: any) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<BannerType>("photo");
  const [promoCode, setPromoCode] = useState("");
  const [priority, setPriority] = useState("1");
  const [duration, setDuration] = useState("5");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const TYPES: BannerType[] = ["photo", "promo", "info", "alert"];

  const reset = () => {
    setTitle(""); setMessage(""); setType("photo"); setPromoCode("");
    setPriority("1"); setDuration("5"); setImageUrl(null);
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo library access to attach a banner image.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (!asset.base64) return;
    const contentType = asset.mimeType ?? "image/jpeg";
    setIsUploading(true);
    try {
      const url = await onUploadImage(asset.base64, contentType, asset.fileName ?? undefined);
      setImageUrl(url);
    } catch (err) {
      Alert.alert("Upload failed", "Could not upload the image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAdd = () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert("Required", "Title and message are required.");
      return;
    }
    onAdd({
      title: title.trim(),
      message: message.trim(),
      type,
      isActive: true,
      priority: parseInt(priority) || 1,
      promoCode: promoCode.trim() || undefined,
      imageUrl: imageUrl ?? undefined,
      displayDuration: parseInt(duration) || 5,
    });
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          style={[{ flex: 1, backgroundColor: colors.background }]}
          contentContainerStyle={[{ padding: 20, gap: 14 }, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Banner</Text>
            <Pressable onPress={() => { reset(); onClose(); }} style={[styles.closeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="x" size={16} color={colors.foreground} />
            </Pressable>
          </View>

          <View style={fieldStyles.wrap}>
            <Text style={[fieldStyles.label, { color: colors.mutedForeground }]}>Banner Image</Text>
            <Pressable
              onPress={handlePickImage}
              disabled={isUploading}
              style={[
                imagePickStyles.picker,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={imagePickStyles.preview} contentFit="cover" />
              ) : isUploading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <View style={imagePickStyles.placeholder}>
                  <Feather name="upload" size={18} color={colors.mutedForeground} />
                  <Text style={[imagePickStyles.placeholderText, { color: colors.mutedForeground }]}>
                    Tap to upload an image
                  </Text>
                </View>
              )}
              {imageUrl && !isUploading && (
                <View style={[imagePickStyles.overlay, { backgroundColor: colors.primary }]}>
                  <Feather name="edit-2" size={11} color="#fff" />
                </View>
              )}
            </Pressable>
          </View>

          <FormField label="Title *" value={title} onChange={setTitle} placeholder="Summer Health Checkup" colors={colors} />
          <View style={fieldStyles.wrap}>
            <Text style={[fieldStyles.label, { color: colors.mutedForeground }]}>Message *</Text>
            <TextInput
              style={[fieldStyles.textarea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={message}
              onChangeText={setMessage}
              placeholder="Describe what this banner promotes..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={3}
            />
          </View>

          <Text style={[fieldStyles.label, { color: colors.mutedForeground }]}>Type</Text>
          <View style={styles.optionRow}>
            {TYPES.map((t) => {
              const m = TYPE_META[t];
              return (
                <Pressable
                  key={t}
                  onPress={() => setType(t)}
                  style={[
                    styles.typeOption,
                    {
                      backgroundColor: type === t ? m.color + "15" : colors.card,
                      borderColor: type === t ? m.color + "40" : colors.border,
                    },
                  ]}
                >
                  <Feather name={m.icon} size={13} color={type === t ? m.color : colors.mutedForeground} />
                  <Text style={[styles.typeOptionText, { color: type === t ? m.color : colors.mutedForeground }]}>
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.twoCol}>
            <FormField label="Promo Code" value={promoCode} onChange={setPromoCode} placeholder="HEALTH20" colors={colors} style={{ flex: 1 }} />
            <FormField label="Priority" value={priority} onChange={setPriority} placeholder="1" colors={colors} keyboardType="number-pad" style={{ flex: 1 }} />
          </View>
          <FormField label="Display Duration (s)" value={duration} onChange={setDuration} placeholder="5" colors={colors} keyboardType="number-pad" />

          <View style={styles.modalFooter}>
            <Pressable onPress={() => { reset(); onClose(); }} style={[styles.cancelBtn, { borderColor: colors.border }]}>
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleAdd} style={[styles.submitBtn, { backgroundColor: colors.primary }]}>
              <Feather name="image" size={14} color="#fff" />
              <Text style={styles.submitText}>Create Banner</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function FormField({ label, value, onChange, placeholder, colors, keyboardType, style }: any) {
  return (
    <View style={[fieldStyles.wrap, style]}>
      <Text style={[fieldStyles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        style={[fieldStyles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        keyboardType={keyboardType || "default"}
        autoCapitalize="none"
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap: { gap: 5 },
  label: { fontSize: 10, fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase" },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  textarea: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, minHeight: 80, textAlignVertical: "top" },
});

const imagePickStyles = StyleSheet.create({
  picker: { height: 140, borderRadius: 12, borderWidth: 1, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  preview: { width: "100%", height: "100%" },
  placeholder: { alignItems: "center", gap: 6 },
  placeholderText: { fontSize: 12 },
  overlay: { position: "absolute", bottom: 8, right: 8, width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
});

const summaryStyles = StyleSheet.create({
  pill: { borderRadius: 12, borderWidth: 1, padding: 10, gap: 2 },
  label: { fontSize: 9, fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase" },
  value: { fontSize: 18, fontWeight: "700", letterSpacing: -0.3 },
});

const cardStyles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10, gap: 10, overflow: "hidden" },
  image: { width: "100%", height: 120, borderRadius: 10, marginTop: -2 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  typeIcon: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerMid: { flex: 1, gap: 4 },
  bannerTitle: { fontSize: 14, fontWeight: "600" },
  metaRow: { flexDirection: "row", gap: 5, flexWrap: "wrap" },
  typeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  typeBadgeText: { fontSize: 8, fontWeight: "700", letterSpacing: 0.8 },
  audienceBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  audienceText: { fontSize: 9, fontWeight: "500" },
  message: { fontSize: 12, lineHeight: 18 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTopWidth: 1 },
  footerLeft: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", flex: 1 },
  priorityBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  priorityText: { fontSize: 9, fontWeight: "500" },
  promoBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  promoText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  durationText: { fontSize: 9 },
  deleteBtn: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  titleGroup: { flex: 1 },
  eyebrow: { fontSize: 9, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase" },
  title: { fontSize: 24, fontWeight: "700", letterSpacing: -0.5 },
  addBtn: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  summaryRow: { flexDirection: "row", gap: 8 },
  filterRow: { flexDirection: "row", gap: 7 },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.3 },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 14 },
  emptyText: { fontSize: 14 },
  emptyBtn: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 12 },
  emptyBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  closeBtn: { width: 34, height: 34, borderRadius: 9, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  optionRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  typeOption: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  typeOptionText: { fontSize: 12, fontWeight: "500" },
  twoCol: { flexDirection: "row", gap: 10 },
  modalFooter: { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  cancelText: { fontSize: 14, fontWeight: "600" },
  submitBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 13, borderRadius: 12 },
  submitText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});

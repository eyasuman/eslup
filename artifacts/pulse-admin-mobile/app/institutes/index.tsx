import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Platform,
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Linking,
  Image,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useData, Institute, InstituteStatus, InstituteType } from "@/context/DataContext";

const TYPE_ICONS: Record<InstituteType, any> = {
  Hospital: "activity",
  Clinic: "user",
  "Diagnostic Center": "search",
  Pharmacy: "package",
  Rehabilitation: "zap",
  Dental: "smile",
  "Specialty Center": "star",
};

const STATUS_FILTERS: Array<InstituteStatus | "All"> = ["All", "Active", "Pending", "Suspended"];

export default function InstitutesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { institutes, addInstitute, updateInstituteStatus, deleteInstitute } = useData();

  const [activeFilter, setActiveFilter] = useState<InstituteStatus | "All">("All");
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  const filtered = useMemo(() => {
    let result = institutes;
    if (activeFilter !== "All") result = result.filter((i) => i.status === activeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (i) => i.name.toLowerCase().includes(q) || i.city.toLowerCase().includes(q) || i.type.toLowerCase().includes(q)
      );
    }
    return result;
  }, [institutes, activeFilter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: institutes.length };
    (["Active", "Pending", "Suspended"] as InstituteStatus[]).forEach((s) => {
      c[s] = institutes.filter((i) => i.status === s).length;
    });
    return c;
  }, [institutes]);

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
            <Text style={[styles.title, { color: colors.foreground }]}>Institutes</Text>
          </View>
          <Pressable
            onPress={() => setShowAddModal(true)}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="plus" size={16} color="#fff" />
          </Pressable>
        </View>

        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={15} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search institutes..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={15} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.filterRow}>
          {STATUS_FILTERS.map((f) => (
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
                {f}
              </Text>
              <Text style={[styles.filterCount, { color: activeFilter === f ? "rgba(255,255,255,0.7)" : colors.mutedForeground }]}>
                {counts[f] ?? 0}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <InstituteCard institute={item} colors={colors} onStatusChange={updateInstituteStatus} onDelete={deleteInstitute} />
        )}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + (Platform.OS === "web" ? 24 : 30) },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="grid" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No institutes found</Text>
          </View>
        }
      />

      <AddInstituteModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={addInstitute}
        colors={colors}
      />
    </View>
  );
}

function CertificateModal({
  url,
  name,
  visible,
  onClose,
  colors,
}: {
  url: string;
  name: string;
  visible: boolean;
  onClose: () => void;
  colors: any;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { width, height } = Dimensions.get("window");
  const isPdf = url.toLowerCase().includes(".pdf");

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={certStyles.backdrop}>
        {/* Header */}
        <View style={[certStyles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={certStyles.headerLeft}>
            <Feather name="file-text" size={15} color={colors.primary} />
            <Text style={[certStyles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
              {name}
            </Text>
          </View>
          <View style={certStyles.headerActions}>
            <Pressable
              onPress={() => Linking.openURL(url).catch(() => Alert.alert("Cannot open", "Failed to open the certificate URL."))}
              style={[certStyles.openBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "30" }]}
            >
              <Feather name="external-link" size={14} color={colors.primary} />
              <Text style={[certStyles.openBtnText, { color: colors.primary }]}>Open</Text>
            </Pressable>
            <Pressable onPress={onClose} style={[certStyles.closeBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="x" size={15} color={colors.foreground} />
            </Pressable>
          </View>
        </View>

        {/* Content */}
        <View style={certStyles.imageWrap}>
          {isPdf ? (
            <View style={certStyles.pdfPlaceholder}>
              <Feather name="file" size={40} color={colors.mutedForeground} />
              <Text style={[certStyles.pdfText, { color: colors.mutedForeground }]}>
                PDF certificate — tap Open to view
              </Text>
              <Pressable
                onPress={() => Linking.openURL(url).catch(() => {})}
                style={[certStyles.openLargeBtn, { backgroundColor: colors.primary }]}
              >
                <Feather name="external-link" size={14} color="#fff" />
                <Text style={certStyles.openLargeBtnText}>Open in Browser</Text>
              </Pressable>
            </View>
          ) : error ? (
            <View style={certStyles.pdfPlaceholder}>
              <Feather name="alert-circle" size={36} color="#ef4444" />
              <Text style={[certStyles.pdfText, { color: colors.mutedForeground }]}>
                Could not load certificate image
              </Text>
              <Pressable
                onPress={() => Linking.openURL(url).catch(() => {})}
                style={[certStyles.openLargeBtn, { backgroundColor: colors.primary }]}
              >
                <Feather name="external-link" size={14} color="#fff" />
                <Text style={certStyles.openLargeBtnText}>Open in Browser</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {loading && (
                <ActivityIndicator
                  size="large"
                  color={colors.primary}
                  style={StyleSheet.absoluteFill}
                />
              )}
              <Image
                source={{ uri: url }}
                style={{ width: width - 32, height: height * 0.65, borderRadius: 10 }}
                resizeMode="contain"
                onLoad={() => setLoading(false)}
                onError={() => { setLoading(false); setError(true); }}
              />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const certStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", alignItems: "center", justifyContent: "center" },
  header: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  headerTitle: { fontSize: 13, fontWeight: "600", flex: 1 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  openBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  openBtnText: { fontSize: 12, fontWeight: "600" },
  closeBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  imageWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  pdfPlaceholder: { alignItems: "center", gap: 16 },
  pdfText: { fontSize: 13, textAlign: "center", maxWidth: 250 },
  openLargeBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 12 },
  openLargeBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});

function InstituteCard({
  institute,
  colors,
  onStatusChange,
  onDelete,
}: {
  institute: Institute;
  colors: any;
  onStatusChange: (id: string, status: InstituteStatus) => void;
  onDelete: (id: string) => void;
}) {
  const [certVisible, setCertVisible] = useState(false);

  const statusColor = {
    Active: { bg: "rgba(16,185,129,0.12)", text: "#10b981", border: "rgba(16,185,129,0.25)" },
    Pending: { bg: "rgba(245,158,11,0.12)", text: "#f59e0b", border: "rgba(245,158,11,0.25)" },
    Suspended: { bg: "rgba(239,68,68,0.12)", text: "#ef4444", border: "rgba(239,68,68,0.25)" },
  }[institute.status];

  const handleDelete = () => {
    Alert.alert(
      "Delete Institute Permanently",
      `Are you sure you want to delete ${institute.name}? This will remove the institute and its app account from Supabase and cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete(institute.id),
        },
      ]
    );
  };

  const handleAction = () => {
    const options = (["Active", "Pending", "Suspended"] as InstituteStatus[])
      .filter((s) => s !== institute.status)
      .map((s) => ({
        text: s,
        onPress: () => onStatusChange(institute.id, s),
        style: s === "Suspended" ? "destructive" as const : "default" as const,
      }));

    Alert.alert(`Manage ${institute.name}`, "Change status or delete permanently:", [
      ...options,
      { text: "Delete Institute Permanently", style: "destructive", onPress: handleDelete },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  return (
    <View style={[cardStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={cardStyles.header}>
        <View style={[cardStyles.iconBox, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "25" }]}>
          <Feather name={TYPE_ICONS[institute.type] || "grid"} size={18} color={colors.primary} />
        </View>
        <View style={cardStyles.headerInfo}>
          <Text style={[cardStyles.name, { color: colors.foreground }]}>{institute.name}</Text>
          <View style={cardStyles.metaRow}>
            <View style={[cardStyles.typeBadge, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Text style={[cardStyles.typeText, { color: colors.mutedForeground }]}>{institute.type}</Text>
            </View>
            <View style={cardStyles.locRow}>
              <Feather name="map-pin" size={10} color={colors.mutedForeground} />
              <Text style={[cardStyles.locText, { color: colors.mutedForeground }]}>{institute.city}</Text>
            </View>
          </View>
        </View>
        <View style={cardStyles.headerRight}>
          <View style={[cardStyles.statusBadge, { backgroundColor: statusColor.bg, borderColor: statusColor.border }]}>
            <Text style={[cardStyles.statusText, { color: statusColor.text }]}>{institute.status.toUpperCase()}</Text>
          </View>
          <Pressable onPress={handleAction} style={[cardStyles.actionBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="more-horizontal" size={14} color={colors.mutedForeground} />
          </Pressable>
        </View>
      </View>

      <View style={[cardStyles.divider, { backgroundColor: colors.border }]} />

      <View style={cardStyles.statsRow}>
        <StatPill icon="users" value={`${institute.totalDoctors} Doctors`} colors={colors} />
        {institute.totalBeds ? <StatPill icon="home" value={`${institute.totalBeds} Beds`} colors={colors} /> : null}
        <StatPill icon="file-text" value={institute.licenseNo} colors={colors} />
      </View>

      {/* Certificate viewer button */}
      {institute.certificateUrl ? (
        <Pressable
          onPress={() => setCertVisible(true)}
          style={[cardStyles.certBtn, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "25" }]}
        >
          <Feather name="file-text" size={12} color={colors.primary} />
          <Text style={[cardStyles.certBtnText, { color: colors.primary }]}>View Certificate</Text>
          <Feather name="chevron-right" size={12} color={colors.primary} style={{ marginLeft: "auto" }} />
        </Pressable>
      ) : null}

      {certVisible && institute.certificateUrl ? (
        <CertificateModal
          url={institute.certificateUrl}
          name={`${institute.name} — Certificate`}
          visible={certVisible}
          onClose={() => setCertVisible(false)}
          colors={colors}
        />
      ) : null}

      {institute.services.length > 0 && (
        <View style={cardStyles.servicesRow}>
          {institute.services.slice(0, 3).map((s) => (
            <View key={s} style={[cardStyles.serviceChip, { backgroundColor: colors.accent + "20", borderColor: colors.primary + "20" }]}>
              <Text style={[cardStyles.serviceText, { color: colors.primary }]}>{s}</Text>
            </View>
          ))}
          {institute.services.length > 3 && (
            <View style={[cardStyles.serviceChip, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Text style={[cardStyles.serviceText, { color: colors.mutedForeground }]}>+{institute.services.length - 3} more</Text>
            </View>
          )}
        </View>
      )}

      <View style={[cardStyles.contactRow, { borderTopColor: colors.border }]}>
        <Feather name="phone" size={10} color={colors.mutedForeground} />
        <Text style={[cardStyles.contactText, { color: colors.mutedForeground }]}>{institute.phone}</Text>
        <Text style={[cardStyles.dot, { color: colors.border }]}>·</Text>
        <Feather name="mail" size={10} color={colors.mutedForeground} />
        <Text style={[cardStyles.contactText, { color: colors.mutedForeground }]}>{institute.email}</Text>
      </View>
    </View>
  );
}

function StatPill({ icon, value, colors }: { icon: any; value: string; colors: any }) {
  return (
    <View style={[pillStyles.pill, { backgroundColor: colors.muted, borderColor: colors.border }]}>
      <Feather name={icon} size={10} color={colors.mutedForeground} />
      <Text style={[pillStyles.text, { color: colors.mutedForeground }]}>{value}</Text>
    </View>
  );
}

function AddInstituteModal({
  visible,
  onClose,
  onAdd,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (inst: Omit<Institute, "id" | "createdAt">) => void;
  colors: any;
}) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [type, setType] = useState<InstituteType>("Hospital");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [licenseNo, setLicenseNo] = useState("");
  const [totalDoctors, setTotalDoctors] = useState("");

  const TYPES: InstituteType[] = ["Hospital", "Clinic", "Diagnostic Center", "Pharmacy", "Rehabilitation", "Dental", "Specialty Center"];

  const reset = () => {
    setName(""); setType("Hospital"); setCity(""); setPhone(""); setEmail(""); setLicenseNo(""); setTotalDoctors("");
  };

  const handleAdd = () => {
    if (!name.trim() || !city.trim() || !licenseNo.trim()) {
      Alert.alert("Required Fields", "Please fill in Name, City, and License No.");
      return;
    }
    onAdd({
      name: name.trim(),
      type,
      status: "Pending",
      city: city.trim(),
      address: city.trim(),
      phone: phone.trim() || "-",
      email: email.trim() || "-",
      licenseNo: licenseNo.trim(),
      totalDoctors: parseInt(totalDoctors) || 0,
      services: [],
    });
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          style={[styles.modalContainer, { backgroundColor: colors.background }]}
          contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Add Institute</Text>
            <Pressable onPress={() => { reset(); onClose(); }} style={[styles.closeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="x" size={16} color={colors.foreground} />
            </Pressable>
          </View>

          <FormField label="Institute Name *" value={name} onChange={setName} placeholder="e.g. Dubai Medical Center" colors={colors} />
          <FormField label="City *" value={city} onChange={setCity} placeholder="e.g. Dubai" colors={colors} />
          <FormField label="License No. *" value={licenseNo} onChange={setLicenseNo} placeholder="e.g. DXB-HC-0011" colors={colors} />
          <FormField label="Phone" value={phone} onChange={setPhone} placeholder="+971 4 XXX XXXX" colors={colors} keyboardType="phone-pad" />
          <FormField label="Email" value={email} onChange={setEmail} placeholder="info@institute.ae" colors={colors} keyboardType="email-address" />
          <FormField label="Total Doctors" value={totalDoctors} onChange={setTotalDoctors} placeholder="0" colors={colors} keyboardType="number-pad" />

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Type</Text>
          <View style={styles.typeGrid}>
            {TYPES.map((t) => (
              <Pressable
                key={t}
                onPress={() => setType(t)}
                style={[
                  styles.typeOption,
                  {
                    backgroundColor: type === t ? colors.primary : colors.card,
                    borderColor: type === t ? colors.primary : colors.border,
                  },
                ]}
              >
                <Feather name={TYPE_ICONS[t]} size={12} color={type === t ? "#fff" : colors.mutedForeground} />
                <Text style={[styles.typeOptionText, { color: type === t ? "#fff" : colors.mutedForeground }]}>{t}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.modalFooter}>
            <Pressable onPress={() => { reset(); onClose(); }} style={[styles.cancelBtn, { borderColor: colors.border }]}>
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
            <Pressable onPress={handleAdd} style={[styles.submitBtn, { backgroundColor: colors.primary }]}>
              <Feather name="check" size={14} color="#fff" />
              <Text style={styles.submitText}>Add Institute</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function FormField({ label, value, onChange, placeholder, colors, keyboardType }: any) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
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

const pillStyles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
  },
  text: { fontSize: 10, fontWeight: "500" },
});

const cardStyles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 10 },
  header: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  iconBox: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headerInfo: { flex: 1, gap: 4 },
  name: { fontSize: 14, fontWeight: "600" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  typeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, borderWidth: 1 },
  typeText: { fontSize: 9, fontWeight: "500", letterSpacing: 0.3 },
  locRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  locText: { fontSize: 10 },
  headerRight: { alignItems: "flex-end", gap: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  statusText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.8 },
  actionBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  divider: { height: 1, marginVertical: 10 },
  statsRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  servicesRow: { flexDirection: "row", gap: 5, flexWrap: "wrap", marginTop: 8 },
  serviceChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  serviceText: { fontSize: 9, fontWeight: "500" },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10, paddingTop: 10, borderTopWidth: 1, flexWrap: "wrap" },
  contactText: { fontSize: 10 },
  dot: { fontSize: 12, marginHorizontal: 2 },
  certBtn: { flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9, marginTop: 6 },
  certBtnText: { fontSize: 12, fontWeight: "600", flex: 1 },
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
  searchBar: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  filterRow: { flexDirection: "row", gap: 7, flexWrap: "wrap" },
  filterChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  filterLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.3 },
  filterCount: { fontSize: 10 },
  list: { paddingHorizontal: 16, paddingTop: 4 },
  empty: { alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 14 },
  modalContainer: { flex: 1 },
  modalContent: { padding: 20, gap: 12 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: "700" },
  closeBtn: { width: 34, height: 34, borderRadius: 9, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  fieldWrap: { gap: 5 },
  fieldLabel: { fontSize: 10, fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase" },
  fieldInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  typeOption: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  typeOptionText: { fontSize: 11, fontWeight: "500" },
  modalFooter: { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  cancelText: { fontSize: 14, fontWeight: "600" },
  submitBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 13, borderRadius: 12 },
  submitText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});

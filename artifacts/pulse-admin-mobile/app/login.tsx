import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) return setError("Enter your email address and password.");
    setSubmitting(true);
    setError(null);
    try { await signIn(email, password); } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in. Please try again.");
    } finally { setSubmitting(false); }
  };

  return <KeyboardAwareScrollViewCompat style={[styles.page, { backgroundColor: colors.darkNavy }]} contentContainerStyle={[styles.content, { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 32 }]} bottomOffset={72}>
    <View style={[styles.mark, { borderColor: colors.brandBlue }]}><Feather name="shield" size={32} color={colors.tint} /></View>
    <Text style={[styles.brand, { color: colors.primaryForeground }]}>PULSE NETWORK</Text>
    <Text style={[styles.title, { color: colors.primaryForeground }]}>Administrator sign in</Text>
    <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Use your authorized Pulse Network account to continue.</Text>
    <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.foreground }]}>EMAIL ADDRESS</Text>
      <TextInput testID="admin-login-email" style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} placeholder="admin@pulse.health" placeholderTextColor={colors.mutedForeground} />
      <Text style={[styles.label, { color: colors.foreground }]}>PASSWORD</Text>
      <TextInput testID="admin-login-password" style={[styles.input, { color: colors.foreground, borderColor: colors.border }]} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" onSubmitEditing={submit} placeholder="Enter password" placeholderTextColor={colors.mutedForeground} />
      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
      <Pressable testID="admin-login-submit" onPress={submit} disabled={submitting} style={[styles.submit, { backgroundColor: submitting ? colors.muted : colors.primary }]}>{submitting ? <ActivityIndicator color={colors.primaryForeground} /> : <><Text style={[styles.submitText, { color: colors.primaryForeground }]}>Sign in</Text><Feather name="arrow-right" size={18} color={colors.primaryForeground} /></>}</Pressable>
    </View>
    <Text style={[styles.footnote, { color: colors.mutedForeground }]}>Access is restricted to accounts assigned the administrator role.</Text>
  </KeyboardAwareScrollViewCompat>;
}
const styles = StyleSheet.create({ page: { flex: 1 }, content: { flexGrow: 1, paddingHorizontal: 24, alignItems: "stretch" }, mark: { width: 72, height: 72, borderWidth: 1, borderRadius: 36, alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 24 }, brand: { textAlign: "center", fontWeight: "700", letterSpacing: 3, fontSize: 16 }, title: { fontSize: 28, fontWeight: "700", textAlign: "center", marginTop: 34 }, subtitle: { fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 10, marginBottom: 34 }, form: { borderWidth: 1, borderRadius: 16, padding: 20 }, label: { fontSize: 10, fontWeight: "700", letterSpacing: 1.2, marginBottom: 8, marginTop: 4 }, input: { borderWidth: 1, borderRadius: 10, height: 50, paddingHorizontal: 14, fontSize: 15, marginBottom: 18 }, error: { fontSize: 13, marginTop: -6, marginBottom: 12 }, submit: { height: 52, borderRadius: 11, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 4 }, submitText: { fontWeight: "700", fontSize: 15 }, footnote: { textAlign: "center", fontSize: 12, lineHeight: 18, marginTop: 22 } });
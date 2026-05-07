import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { getCompany } from "../../lib/api";

export default function HomeScreen() {
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    const s = slug.trim().toLowerCase();
    if (!s) return;
    setLoading(true);
    setError(null);
    try {
      await getCompany(s); // validates it exists
      router.push(`/company/${s}`);
    } catch {
      setError("Empresa não encontrada. Verifique o link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.logo}>Agendei</Text>
        <Text style={styles.tagline}>Encontre uma empresa e agende online</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Buscar empresa</Text>
        <Text style={styles.cardDesc}>
          Digite o slug da empresa (ex: minha-limpeza) ou cole o link de agendamento.
        </Text>

        <TextInput
          style={styles.input}
          value={slug}
          onChangeText={setSlug}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="slug-da-empresa"
          placeholderTextColor="#9ca3af"
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSearch}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Buscar</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Como funciona?</Text>
        <Text style={styles.infoText}>
          1. Encontre a empresa pelo link ou slug{"\n"}
          2. Escolha o serviço e o horário{"\n"}
          3. Receba confirmação e lembrete por push + e-mail
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  content: { padding: 20, paddingBottom: 40 },
  hero: { alignItems: "center", paddingVertical: 32 },
  logo: { fontSize: 32, fontWeight: "800", color: "#1d4ed8", letterSpacing: -1 },
  tagline: { fontSize: 15, color: "#6b7280", marginTop: 6, textAlign: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 6 },
  cardDesc: { fontSize: 13, color: "#6b7280", marginBottom: 14, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#f9fafb",
    marginBottom: 8,
  },
  error: { color: "#dc2626", fontSize: 13, marginBottom: 8 },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 6,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  infoBox: {
    backgroundColor: "#eff6ff",
    borderRadius: 16,
    padding: 18,
  },
  infoTitle: { fontSize: 14, fontWeight: "700", color: "#1d4ed8", marginBottom: 8 },
  infoText: { fontSize: 13, color: "#3b82f6", lineHeight: 22 },
});

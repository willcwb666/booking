import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { getCompany } from "../../lib/api";

type Config = {
  id: string;
  name: string;
  serviceTypes: Array<{
    serviceType: { name: string; price: string; estimatedMinutes: number };
  }>;
};

type Company = {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  address: string | null;
  bookingConfigs: Config[];
};

function formatPrice(price: string) {
  return `R$ ${Number(price).toFixed(2).replace(".", ",")}`;
}

export default function CompanyScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    getCompany(slug)
      .then(setCompany)
      .catch(() => setError("Empresa não encontrada"))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#2563eb" />
      </View>
    );
  }

  if (error || !company) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? "Erro ao carregar"}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Company header */}
      <View style={styles.header}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>{company.name[0].toUpperCase()}</Text>
        </View>
        <Text style={styles.companyName}>{company.name}</Text>
        {company.address && <Text style={styles.address}>{company.address}</Text>}
        {company.phone && <Text style={styles.phone}>{company.phone}</Text>}
      </View>

      <Text style={styles.sectionTitle}>Serviços disponíveis</Text>

      {company.bookingConfigs.length === 0 ? (
        <Text style={styles.empty}>Nenhum serviço disponível no momento.</Text>
      ) : (
        company.bookingConfigs.map((config) => {
          const firstService = config.serviceTypes[0]?.serviceType;
          return (
            <TouchableOpacity
              key={config.id}
              style={styles.configCard}
              onPress={() => router.push(`/book/${config.id}?slug=${company.slug}&companyName=${encodeURIComponent(company.name)}`)}
              activeOpacity={0.7}
            >
              <View style={styles.configInfo}>
                <Text style={styles.configName}>{config.name}</Text>
                {firstService && (
                  <Text style={styles.configDetail}>
                    {firstService.name} · {firstService.estimatedMinutes} min
                  </Text>
                )}
                {config.serviceTypes.length > 1 && (
                  <Text style={styles.configMore}>
                    +{config.serviceTypes.length - 1} serviço(s)
                  </Text>
                )}
              </View>
              {firstService && (
                <Text style={styles.configPrice}>{formatPrice(firstService.price)}</Text>
              )}
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { color: "#dc2626", fontSize: 15 },
  header: { alignItems: "center", marginBottom: 28, paddingTop: 8 },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoText: { fontSize: 28, fontWeight: "800", color: "#2563eb" },
  companyName: { fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 4 },
  address: { fontSize: 13, color: "#6b7280", marginBottom: 2 },
  phone: { fontSize: 13, color: "#6b7280" },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
  empty: { fontSize: 14, color: "#9ca3af", textAlign: "center", marginTop: 20 },
  configCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  configInfo: { flex: 1, marginRight: 12 },
  configName: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 3 },
  configDetail: { fontSize: 13, color: "#6b7280" },
  configMore: { fontSize: 12, color: "#3b82f6", marginTop: 3 },
  configPrice: { fontSize: 17, fontWeight: "800", color: "#2563eb" },
});

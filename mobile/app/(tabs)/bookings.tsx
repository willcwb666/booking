import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { getMyBookings } from "../../lib/api";

type Booking = {
  id: string;
  companyName: string;
  serviceName: string;
  scheduledDate: string;
  scheduledStartTime: string;
  status: string;
  hasReview: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Aguardando",
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  FAILED: "Falhou",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING: "#f59e0b",
  CONFIRMED: "#3b82f6",
  IN_PROGRESS: "#8b5cf6",
  COMPLETED: "#10b981",
  CANCELLED: "#ef4444",
  FAILED: "#ef4444",
};

function formatDate(date: string) {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

export default function BookingsScreen() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const data = await getMyBookings();
      setBookings(data);
      setError(null);
    } catch {
      setError("Não foi possível carregar os agendamentos");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useFocusEffect(useCallback(() => { load(); }, []));

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563eb" />
        }
        contentContainerStyle={bookings.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nenhum agendamento</Text>
            <Text style={styles.emptyText}>
              Vá para Início, encontre uma empresa e faça seu primeiro agendamento.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/booking/${item.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.cardTop}>
              <Text style={styles.company}>{item.companyName}</Text>
              <View style={[styles.badge, { backgroundColor: `${STATUS_COLOR[item.status]}18` }]}>
                <Text style={[styles.badgeText, { color: STATUS_COLOR[item.status] }]}>
                  {STATUS_LABEL[item.status] ?? item.status}
                </Text>
              </View>
            </View>
            <Text style={styles.service}>{item.serviceName}</Text>
            <Text style={styles.date}>
              {formatDate(item.scheduledDate)} às {item.scheduledStartTime}
            </Text>
            {item.status === "COMPLETED" && !item.hasReview && (
              <Text style={styles.reviewHint}>Deixe sua avaliação →</Text>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  error: { color: "#dc2626", fontSize: 13, padding: 16 },
  list: { padding: 16, gap: 10 },
  emptyContainer: { flex: 1, padding: 24 },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#374151", marginBottom: 8 },
  emptyText: { fontSize: 14, color: "#9ca3af", textAlign: "center", lineHeight: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  company: { fontSize: 15, fontWeight: "700", color: "#111827", flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  service: { fontSize: 13, color: "#6b7280", marginBottom: 4 },
  date: { fontSize: 13, color: "#374151", fontWeight: "500" },
  reviewHint: { fontSize: 12, color: "#2563eb", marginTop: 6, fontWeight: "600" },
});

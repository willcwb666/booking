import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { getBooking } from "../../lib/api";

type Booking = {
  id: string;
  companyName: string;
  companyPhone: string | null;
  serviceName: string;
  scheduledDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
  } | null;
  review: { id: string; rating: number; comment: string | null } | null;
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Aguardando pagamento",
  CONFIRMED: "Confirmado",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  FAILED: "Pagamento falhou",
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

function Stars({ rating }: { rating: number }) {
  return (
    <Text style={{ fontSize: 18 }}>
      {Array.from({ length: 5 }, (_, i) => (i < rating ? "★" : "☆")).join("")}
    </Text>
  );
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getBooking(id)
      .then(setBooking)
      .catch(() => router.back())
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#2563eb" />
      </View>
    );
  }

  if (!booking) return null;

  const statusColor = STATUS_COLOR[booking.status] ?? "#6b7280";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Status */}
      <View style={[styles.statusBanner, { backgroundColor: `${statusColor}18` }]}>
        <Text style={[styles.statusText, { color: statusColor }]}>
          {STATUS_LABEL[booking.status] ?? booking.status}
        </Text>
      </View>

      {/* Service info */}
      <View style={styles.card}>
        <Text style={styles.companyName}>{booking.companyName}</Text>
        <Text style={styles.serviceName}>{booking.serviceName}</Text>
        <View style={styles.divider} />
        <Row label="Data" value={formatDate(booking.scheduledDate)} />
        <Row label="Horário" value={`${booking.scheduledStartTime} – ${booking.scheduledEndTime}`} />
        <Row label="Pagamento" value={booking.paymentMethod === "CARD" ? "Cartão" : "Dinheiro"} />
        <Row label="Status pag." value={booking.paymentStatus === "PAID" ? "Pago" : booking.paymentStatus} />
      </View>

      {/* Customer */}
      {booking.customer && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Dados do cliente</Text>
          <Row label="Nome" value={`${booking.customer.firstName} ${booking.customer.lastName}`} />
          <Row label="E-mail" value={booking.customer.email} />
          <Row label="Telefone" value={booking.customer.phone} />
          <Row label="Endereço" value={`${booking.customer.address}, ${booking.customer.city}`} />
        </View>
      )}

      {/* Review */}
      {booking.status === "COMPLETED" && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Avaliação</Text>
          {booking.review ? (
            <>
              <Stars rating={booking.review.rating} />
              {booking.review.comment && (
                <Text style={styles.reviewComment}>{booking.review.comment}</Text>
              )}
            </>
          ) : (
            <Text style={styles.noReview}>Você ainda não avaliou este serviço.</Text>
          )}
        </View>
      )}

      {/* Contact */}
      {booking.companyPhone && (
        <TouchableOpacity
          style={styles.contactButton}
          onPress={() => Linking.openURL(`tel:${booking.companyPhone}`)}
        >
          <Text style={styles.contactText}>Ligar para a empresa</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  statusBanner: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  statusText: { fontSize: 15, fontWeight: "700" },
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
  companyName: { fontSize: 17, fontWeight: "800", color: "#111827", marginBottom: 2 },
  serviceName: { fontSize: 14, color: "#6b7280", marginBottom: 12 },
  divider: { height: 1, backgroundColor: "#f3f4f6", marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  rowLabel: { fontSize: 13, color: "#6b7280", flex: 1 },
  rowValue: { fontSize: 13, color: "#111827", fontWeight: "500", flex: 2, textAlign: "right" },
  reviewComment: { fontSize: 14, color: "#374151", marginTop: 8, lineHeight: 20 },
  noReview: { fontSize: 14, color: "#9ca3af" },
  contactButton: {
    backgroundColor: "#eff6ff",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  contactText: { color: "#2563eb", fontSize: 15, fontWeight: "600" },
});

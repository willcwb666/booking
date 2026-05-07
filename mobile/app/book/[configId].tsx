import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import {
  getBookingConfig,
  getAvailableSlots,
  createEstimate,
  createBooking,
  type BookingConfigDetail,
  type TimeSlot,
} from "../../lib/api";

type Step = "services" | "datetime" | "details";

function formatPrice(price: string | number) {
  return `R$ ${Number(price).toFixed(2).replace(".", ",")}`;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateBR(date: string) {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday-based
  const days: { date: Date; isCurrentMonth: boolean }[] = [];

  for (let i = 0; i < startOffset; i++) {
    days.push({ date: new Date(year, month, -startOffset + i + 1), isCurrentMonth: false });
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: new Date(year, month, d), isCurrentMonth: true });
  }
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
  }
  return days;
}

function isDateDisabled(dateStr: string, agenda: BookingConfigDetail["agenda"]): boolean {
  const today = toDateStr(new Date());
  if (dateStr < today) return true;
  if (dateStr < agenda.startDate) return true;
  if (agenda.endDate && dateStr > agenda.endDate) return true;
  const [y, m, d] = dateStr.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return !agenda.workingDays.includes(dow);
}

export default function BookingFlowScreen() {
  const { configId, slug, companyName } = useLocalSearchParams<{
    configId: string;
    slug: string;
    companyName: string;
  }>();

  const [config, setConfig] = useState<BookingConfigDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("services");
  const [error, setError] = useState<string | null>(null);

  // Service selection
  const [serviceQty, setServiceQty] = useState<Record<string, number>>({});
  const [extraSelected, setExtraSelected] = useState<Record<string, boolean>>({});
  const [frequency, setFrequency] = useState("ONCE");

  // Date/time
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Customer details
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [sendReminders, setSendReminders] = useState(true);
  const [address, setAddress] = useState("");
  const [aptNo, setAptNo] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [additionalNote, setAdditionalNote] = useState("");

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!configId) return;
    getBookingConfig(configId)
      .then((data) => {
        setConfig(data);
        // Initialize service quantities
        const init: Record<string, number> = {};
        for (const st of data.serviceTypes) {
          init[st.id] = data.allowPartialService ? 0 : 1;
        }
        setServiceQty(init);
      })
      .catch(() => {
        setError("Configuração não encontrada");
      })
      .finally(() => setLoading(false));
  }, [configId]);

  const handleDateSelect = useCallback(
    async (dateStr: string) => {
      if (!config || isDateDisabled(dateStr, config.agenda)) return;
      setSelectedDate(dateStr);
      setSelectedSlot(null);
      setLoadingSlots(true);
      try {
        const available = await getAvailableSlots(config.agenda.id, dateStr);
        setSlots(available);
      } catch {
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    },
    [config]
  );

  // Calculate total
  const total = config
    ? config.serviceTypes.reduce((sum, st) => {
        const qty = serviceQty[st.id] ?? 0;
        return sum + Number(st.price) * qty;
      }, 0) +
      config.extraServices.reduce((sum, es) => {
        return sum + (extraSelected[es.id] ? Number(es.price) : 0);
      }, 0)
    : 0;

  const hasSelection = Object.values(serviceQty).some((q) => q > 0);

  async function handleSubmitServices() {
    if (!config || !hasSelection) return;
    setStep("datetime");
  }

  async function handleSubmitDateTime() {
    if (!selectedDate || !selectedSlot) {
      Alert.alert("Atenção", "Selecione data e horário");
      return;
    }
    setStep("details");
  }

  async function handleConfirmBooking() {
    if (!config || !selectedDate || !selectedSlot) return;
    if (!firstName || !lastName || !email || !phone || !address || !city || !zip) {
      Alert.alert("Atenção", "Preencha todos os campos obrigatórios");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // 1. Create estimate
      const serviceItems = Object.entries(serviceQty)
        .filter(([, q]) => q > 0)
        .map(([serviceTypeId, quantity]) => ({ serviceTypeId, quantity }));
      const extraServiceIds = Object.entries(extraSelected)
        .filter(([, v]) => v)
        .map(([id]) => id);

      const est = await createEstimate({
        bookingConfigId: config.id,
        frequency,
        serviceItems,
        extraServiceIds,
      });

      // 2. Create booking
      const result = await createBooking({
        estimateId: est.estimateId,
        agendaId: config.agenda.id,
        scheduledDate: selectedDate,
        scheduledStartTime: selectedSlot.startTime,
        scheduledEndTime: selectedSlot.endTime,
        paymentMethod: "CASH_CHECK",
        firstName,
        lastName,
        email,
        phone,
        sendReminders,
        address,
        aptNo: aptNo || null,
        city,
        zip,
        accessType: "someone_home",
        keepKeyWithProvider: false,
        accessNote: null,
        additionalNote: additionalNote || null,
      });

      Alert.alert("Agendamento confirmado!", "Você receberá uma notificação de confirmação.", [
        { text: "Ver agendamento", onPress: () => router.replace(`/booking/${result.bookingId}`) },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao criar agendamento";
      setError(msg);
      Alert.alert("Erro", msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#2563eb" />
      </View>
    );
  }

  if (error && !config) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!config) return null;

  // ─── Step: Services ──────────────────────────────────────────────────────────

  if (step === "services") {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{companyName ?? "Agendar"}</Text>
          <Text style={styles.subtitle}>{config.name}</Text>

          {/* Frequency */}
          <Text style={styles.sectionTitle}>Frequência</Text>
          <View style={styles.freqRow}>
            {(["ONCE", "WEEKLY", "BIWEEKLY", "MONTHLY"] as const).map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.freqBtn, frequency === f && styles.freqBtnActive]}
                onPress={() => setFrequency(f)}
              >
                <Text style={[styles.freqText, frequency === f && styles.freqTextActive]}>
                  {{ ONCE: "Única", WEEKLY: "Semanal", BIWEEKLY: "Quinzenal", MONTHLY: "Mensal" }[f]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Services */}
          <Text style={styles.sectionTitle}>Serviços</Text>
          {config.serviceTypes.map((st) => {
            const qty = serviceQty[st.id] ?? 0;
            const selected = qty > 0;
            return (
              <View key={st.id} style={[styles.serviceCard, selected && styles.serviceCardActive]}>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{st.name}</Text>
                  <Text style={styles.serviceDetail}>
                    {formatPrice(st.price)} · {st.estimatedMinutes}min
                  </Text>
                </View>
                <View style={styles.qtyRow}>
                  {config.allowPartialService && !selected && (
                    <TouchableOpacity
                      style={styles.addBtn}
                      onPress={() => setServiceQty((p) => ({ ...p, [st.id]: 1 }))}
                    >
                      <Text style={styles.addBtnText}>Adicionar</Text>
                    </TouchableOpacity>
                  )}
                  {selected && (
                    <>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() =>
                          setServiceQty((p) => ({
                            ...p,
                            [st.id]: config.allowPartialService ? Math.max(0, qty - 1) : Math.max(1, qty - 1),
                          }))
                        }
                      >
                        <Text style={styles.qtyBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyValue}>{qty}</Text>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => setServiceQty((p) => ({ ...p, [st.id]: qty + 1 }))}
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            );
          })}

          {/* Extras */}
          {config.extraServices.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Adicionais</Text>
              {config.extraServices.map((es) => {
                const on = !!extraSelected[es.id];
                return (
                  <TouchableOpacity
                    key={es.id}
                    style={[styles.serviceCard, on && styles.serviceCardActive]}
                    onPress={() => setExtraSelected((p) => ({ ...p, [es.id]: !on }))}
                  >
                    <View style={styles.serviceInfo}>
                      <Text style={styles.serviceName}>{es.name}</Text>
                      <Text style={styles.serviceDetail}>
                        {formatPrice(es.price)} · {es.estimatedMinutes}min
                      </Text>
                    </View>
                    <View style={[styles.checkbox, on && styles.checkboxActive]}>
                      {on && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </ScrollView>

        {/* Bottom bar */}
        <View style={styles.bottomBar}>
          <View>
            <Text style={styles.bottomLabel}>Total estimado</Text>
            <Text style={styles.bottomTotal}>{formatPrice(total)}</Text>
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, !hasSelection && styles.btnDisabled]}
            onPress={handleSubmitServices}
            disabled={!hasSelection}
          >
            <Text style={styles.primaryBtnText}>Continuar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Step: Date & Time ───────────────────────────────────────────────────────

  if (step === "datetime") {
    const days = getMonthDays(calYear, calMonth);
    const todayStr = toDateStr(today);

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <TouchableOpacity onPress={() => setStep("services")}>
            <Text style={styles.backLink}>← Voltar aos serviços</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Escolha a data e horário</Text>

          {/* Calendar */}
          <View style={styles.calCard}>
            <View style={styles.calHeader}>
              <TouchableOpacity
                onPress={() => {
                  if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
                  else setCalMonth((m) => m - 1);
                }}
              >
                <Text style={styles.calNav}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.calTitle}>{MONTH_NAMES[calMonth]} {calYear}</Text>
              <TouchableOpacity
                onPress={() => {
                  if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
                  else setCalMonth((m) => m + 1);
                }}
              >
                <Text style={styles.calNav}>›</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.calWeekRow}>
              {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
                <Text key={d} style={styles.calWeekDay}>{d}</Text>
              ))}
            </View>

            {Array.from({ length: Math.ceil(days.length / 7) }, (_, ri) => (
              <View key={ri} style={styles.calWeekRow}>
                {days.slice(ri * 7, ri * 7 + 7).map(({ date, isCurrentMonth }) => {
                  const ds = toDateStr(date);
                  const disabled = !isCurrentMonth || isDateDisabled(ds, config.agenda);
                  const isSelected = ds === selectedDate;
                  const isToday = ds === todayStr;
                  return (
                    <TouchableOpacity
                      key={ds}
                      disabled={disabled}
                      onPress={() => handleDateSelect(ds)}
                      style={[
                        styles.calDay,
                        isSelected && styles.calDaySelected,
                        isToday && !isSelected && styles.calDayToday,
                      ]}
                    >
                      <Text
                        style={[
                          styles.calDayText,
                          disabled && styles.calDayDisabled,
                          isSelected && styles.calDayTextSelected,
                        ]}
                      >
                        {date.getDate()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Time slots */}
          {selectedDate && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                Horários — {formatDateBR(selectedDate)}
              </Text>
              {loadingSlots ? (
                <ActivityIndicator color="#2563eb" style={{ marginVertical: 16 }} />
              ) : slots.length === 0 ? (
                <Text style={styles.emptySlots}>Nenhum horário disponível neste dia.</Text>
              ) : (
                <View style={styles.slotsGrid}>
                  {slots.map((slot) => {
                    const isSelected = selectedSlot?.startTime === slot.startTime;
                    return (
                      <TouchableOpacity
                        key={slot.startTime}
                        style={[styles.slotBtn, isSelected && styles.slotBtnActive]}
                        onPress={() => setSelectedSlot(slot)}
                      >
                        <Text style={[styles.slotText, isSelected && styles.slotTextActive]}>
                          {slot.startTime}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </ScrollView>

        <View style={styles.bottomBar}>
          <View>
            <Text style={styles.bottomLabel}>{formatPrice(total)}</Text>
            {selectedDate && selectedSlot && (
              <Text style={styles.bottomSub}>
                {formatDateBR(selectedDate)} às {selectedSlot.startTime}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, (!selectedDate || !selectedSlot) && styles.btnDisabled]}
            onPress={handleSubmitDateTime}
            disabled={!selectedDate || !selectedSlot}
          >
            <Text style={styles.primaryBtnText}>Continuar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Step: Details ───────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => setStep("datetime")}>
          <Text style={styles.backLink}>← Voltar à data/hora</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Seus dados</Text>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{config.name}</Text>
          <Text style={styles.summaryDetail}>
            {formatDateBR(selectedDate!)} às {selectedSlot!.startTime} — {formatPrice(total)}
          </Text>
        </View>

        {/* Customer form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dados pessoais</Text>
          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <Text style={styles.label}>Nome *</Text>
              <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} />
            </View>
            <View style={styles.formHalf}>
              <Text style={styles.label}>Sobrenome *</Text>
              <TextInput style={styles.input} value={lastName} onChangeText={setLastName} />
            </View>
          </View>
          <Text style={styles.label}>E-mail *</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Text style={styles.label}>Telefone *</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Receber lembretes</Text>
            <Switch value={sendReminders} onValueChange={setSendReminders} trackColor={{ true: "#2563eb" }} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Endereço do serviço</Text>
          <Text style={styles.label}>Endereço *</Text>
          <TextInput style={styles.input} value={address} onChangeText={setAddress} />
          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <Text style={styles.label}>Apto / Complemento</Text>
              <TextInput style={styles.input} value={aptNo} onChangeText={setAptNo} />
            </View>
            <View style={styles.formHalf}>
              <Text style={styles.label}>CEP *</Text>
              <TextInput style={styles.input} value={zip} onChangeText={setZip} keyboardType="numeric" />
            </View>
          </View>
          <Text style={styles.label}>Cidade *</Text>
          <TextInput style={styles.input} value={city} onChangeText={setCity} />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Observações (opcional)</Text>
          <TextInput
            style={[styles.input, { height: 72, textAlignVertical: "top" }]}
            value={additionalNote}
            onChangeText={setAdditionalNote}
            multiline
            placeholder="Algo que devemos saber?"
            placeholderTextColor="#9ca3af"
          />
        </View>

        {error && <Text style={styles.formError}>{error}</Text>}
      </ScrollView>

      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomLabel}>{formatPrice(total)}</Text>
          <Text style={styles.bottomSub}>Pagamento no dia</Text>
        </View>
        <TouchableOpacity
          style={[styles.primaryBtn, submitting && styles.btnDisabled]}
          onPress={handleConfirmBooking}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Confirmar</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  content: { padding: 16, paddingBottom: 100 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { color: "#dc2626", fontSize: 15 },

  title: { fontSize: 20, fontWeight: "800", color: "#111827", marginBottom: 2 },
  subtitle: { fontSize: 14, color: "#6b7280", marginBottom: 20 },
  backLink: { fontSize: 14, color: "#2563eb", fontWeight: "600", marginBottom: 16 },

  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 10,
  },

  // Frequency
  freqRow: { flexDirection: "row", gap: 8 },
  freqBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },
  freqBtnActive: { borderColor: "#2563eb", backgroundColor: "#2563eb" },
  freqText: { fontSize: 12, fontWeight: "600", color: "#6b7280" },
  freqTextActive: { color: "#fff" },

  // Service cards
  serviceCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
  },
  serviceCardActive: { borderColor: "#93c5fd", backgroundColor: "#eff6ff" },
  serviceInfo: { flex: 1, marginRight: 12 },
  serviceName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  serviceDetail: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnText: { fontSize: 16, color: "#374151", fontWeight: "600" },
  qtyValue: { fontSize: 15, fontWeight: "700", color: "#111827", minWidth: 20, textAlign: "center" },
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#eff6ff",
  },
  addBtnText: { fontSize: 13, fontWeight: "600", color: "#2563eb" },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: { borderColor: "#2563eb", backgroundColor: "#2563eb" },
  checkmark: { color: "#fff", fontSize: 14, fontWeight: "800" },

  // Calendar
  calCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  calHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  calNav: { fontSize: 22, color: "#6b7280", paddingHorizontal: 12 },
  calTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  calWeekRow: { flexDirection: "row" },
  calWeekDay: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "600",
    color: "#9ca3af",
    paddingBottom: 8,
  },
  calDay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  calDaySelected: { backgroundColor: "#2563eb", borderRadius: 20 },
  calDayToday: { borderWidth: 1, borderColor: "#93c5fd", borderRadius: 20 },
  calDayText: { fontSize: 14, color: "#111827" },
  calDayDisabled: { color: "#d1d5db" },
  calDayTextSelected: { color: "#fff", fontWeight: "700" },

  // Slots
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginTop: 12,
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 12 },
  emptySlots: { fontSize: 13, color: "#9ca3af", textAlign: "center", paddingVertical: 12 },
  slotsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slotBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
  },
  slotBtnActive: { borderColor: "#2563eb", backgroundColor: "#2563eb" },
  slotText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  slotTextActive: { color: "#fff" },

  // Summary
  summaryCard: {
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  summaryTitle: { fontSize: 15, fontWeight: "700", color: "#1d4ed8" },
  summaryDetail: { fontSize: 13, color: "#3b82f6", marginTop: 4 },

  // Form
  label: { fontSize: 12, color: "#6b7280", marginBottom: 4, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#f9fafb",
  },
  formRow: { flexDirection: "row", gap: 10 },
  formHalf: { flex: 1 },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
  },
  switchLabel: { fontSize: 14, color: "#374151" },
  formError: { color: "#dc2626", fontSize: 13, marginTop: 8, textAlign: "center" },

  // Bottom bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bottomLabel: { fontSize: 14, fontWeight: "700", color: "#111827" },
  bottomTotal: { fontSize: 18, fontWeight: "800", color: "#111827" },
  bottomSub: { fontSize: 12, color: "#6b7280" },
  primaryBtn: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  btnDisabled: { opacity: 0.5 },
});

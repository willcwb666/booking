import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
const TOKEN_KEY = "agendei_session_token";

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Erro desconhecido" }));
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Auth ──────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string) {
  const res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, callbackURL: "/" }),
  });
  if (!res.ok) throw new Error("E-mail ou senha incorretos");
  const data = await res.json();
  // better-auth returns { token, user } or { session: { token }, user }
  const token: string = data.token ?? data.session?.token;
  if (!token) throw new Error("Não foi possível obter a sessão");
  await setToken(token);
  return data.user as { id: string; name: string; email: string };
}

export async function register(name: string, email: string, password: string) {
  const res = await fetch(`${BASE_URL}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, callbackURL: "/" }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? "Erro ao criar conta");
  }
  const data = await res.json();
  const token: string = data.token ?? data.session?.token;
  if (!token) throw new Error("Não foi possível obter a sessão");
  await setToken(token);
  return data.user as { id: string; name: string; email: string };
}

export async function logout() {
  await clearToken();
}

// ─── Mobile API ────────────────────────────────────────────────────────────────

export function getMe() {
  return request<{ id: string; name: string; email: string }>("/api/mobile/me");
}

export function getCompany(slug: string) {
  return request<{
    id: string;
    name: string;
    slug: string;
    phone: string | null;
    address: string | null;
    bookingConfigs: Array<{
      id: string;
      name: string;
      serviceTypes: Array<{
        serviceType: { name: string; price: string; estimatedMinutes: number };
      }>;
    }>;
  }>(`/api/mobile/companies/${slug}`);
}

export function getMyBookings() {
  return request<
    Array<{
      id: string;
      companyName: string;
      companySlug: string;
      serviceName: string;
      scheduledDate: string;
      scheduledStartTime: string;
      scheduledEndTime: string;
      status: string;
      paymentMethod: string;
      paymentStatus: string;
      hasReview: boolean;
    }>
  >("/api/mobile/bookings");
}

export function getBooking(id: string) {
  return request<{
    id: string;
    companyName: string;
    companySlug: string;
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
  }>(`/api/mobile/bookings/${id}`);
}

export function registerPushToken(token: string, platform: "ios" | "android") {
  return request("/api/mobile/push-token", {
    method: "POST",
    body: JSON.stringify({ token, platform }),
  });
}

// ─── Booking flow ─────────────────────────────────────────────────────────────

export type BookingConfigDetail = {
  id: string;
  name: string;
  companyId: string;
  agendaId: string;
  allowPartialService: boolean;
  agenda: {
    id: string;
    startDate: string;
    endDate: string | null;
    workingDays: number[];
    startTime: string;
    endTime: string;
    intervalMinutes: number;
  };
  serviceTypes: Array<{
    id: string;
    name: string;
    description: string | null;
    price: string;
    estimatedMinutes: number;
  }>;
  extraServices: Array<{
    id: string;
    name: string;
    description: string | null;
    price: string;
    estimatedMinutes: number;
  }>;
};

export type TimeSlot = { startTime: string; endTime: string };

export function getBookingConfig(id: string) {
  return request<BookingConfigDetail>(`/api/mobile/configs/${id}`);
}

export function getAvailableSlots(agendaId: string, date: string) {
  return request<TimeSlot[]>(`/api/mobile/slots?agendaId=${agendaId}&date=${date}`);
}

export function createEstimate(data: {
  bookingConfigId: string;
  frequency: string;
  serviceItems: { serviceTypeId: string; quantity: number }[];
  extraServiceIds: string[];
}) {
  return request<{ estimateId: string; total: string; agendaId: string }>(
    "/api/mobile/estimates",
    { method: "POST", body: JSON.stringify(data) }
  );
}

export function createBooking(data: {
  estimateId: string;
  agendaId: string;
  scheduledDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  paymentMethod: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  sendReminders: boolean;
  address: string;
  aptNo: string | null;
  city: string;
  zip: string;
  accessType: string;
  keepKeyWithProvider: boolean;
  accessNote: string | null;
  additionalNote: string | null;
}) {
  return request<{ bookingId: string }>("/api/mobile/bookings/create", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

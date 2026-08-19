/**
 * Motor de Experiência VIP e Preferências de Atendimento Personalizado
 */

export type ConversationMode = "NORMAL" | "SILENT_FOCUS" | "QUIET";
export type WelcomeDrink = "COFFEE" | "WATER_SPARKLING" | "WATER_STILL" | "BEER" | "NONE";
export type SensitivityMode = "NORMAL" | "SENSITIVE_SKIN" | "NO_BLADE" | "FRAGILE_HAIR";

export interface VIPCustomerPreferences {
  conversationMode: ConversationMode;
  welcomeDrink: WelcomeDrink;
  sensitivityMode: SensitivityMode;
  customObservation?: string;
}

export const CONVERSATION_MODE_LABELS: Record<ConversationMode, { title: string; subtitle: string; icon: string }> = {
  NORMAL: { title: "Conversa Normal", subtitle: "Bate-papo amigável", icon: "💬" },
  SILENT_FOCUS: { title: "Modo Silencioso / Foco", subtitle: "Prefiro relaxar ou trabalhar em silêncio", icon: "🤫" },
  QUIET: { title: "Atendimento Rápido & Discreto", subtitle: "Foco direto no resultado", icon: "⚡" },
};

export const WELCOME_DRINK_LABELS: Record<WelcomeDrink, { title: string; icon: string }> = {
  COFFEE: { title: "Café Expresso", icon: "☕" },
  WATER_SPARKLING: { title: "Água com Gás & Gelo", icon: "🍋" },
  WATER_STILL: { title: "Água Gelada", icon: "💧" },
  BEER: { title: "Cerveja Cortesia", icon: "🍺" },
  NONE: { title: "Sem Bebida", icon: "🚫" },
};

export const SENSITIVITY_LABELS: Record<SensitivityMode, { title: string; icon: string }> = {
  NORMAL: { title: "Padrão", icon: "✨" },
  SENSITIVE_SKIN: { title: "Pele Sensível", icon: "🧴" },
  NO_BLADE: { title: "Sem Navalha / Lâmina", icon: "✂️" },
  FRAGILE_HAIR: { title: "Cabelo/Couro Cabeludo Sensível", icon: "🌿" },
};

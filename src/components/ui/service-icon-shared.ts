// Shared helpers/aliases for the Lucide-based service icon picker.
// Icon names are stored in Lucide's canonical kebab-case (e.g. "washing-machine").

export function normalizeStr(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

// "washing-machine" -> "WashingMachine", "building-2" -> "Building2"
export function kebabToPascal(kebab: string): string {
  return kebab
    .split("-")
    .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : ""))
    .join("");
}

// Search aliases (Portuguese/English) → canonical kebab-case Lucide names.
export const SEARCH_ALIASES: Record<string, string[]> = {
  geladeira: ["refrigerator"],
  fridge: ["refrigerator"],
  freezer: ["refrigerator"],
  refrigerador: ["refrigerator"],
  trabalhador: ["hard-hat", "users", "user-cog", "user-check", "construction", "briefcase", "hammer", "wrench"],
  trabalhadores: ["hard-hat", "users", "user-cog", "user-check", "construction", "briefcase", "hammer", "wrench"],
  worker: ["hard-hat", "users", "user-cog", "user-check", "construction", "briefcase", "hammer", "wrench"],
  workers: ["hard-hat", "users", "user-cog", "user-check", "construction", "briefcase", "hammer", "wrench"],
  obra: ["construction", "hard-hat", "hammer"],
  construcao: ["construction", "hard-hat", "hammer"],
  maquina: ["washing-machine"],
  lavanderia: ["washing-machine", "shirt"],
  dente: ["smile-plus", "smile"],
  dentista: ["smile-plus", "smile", "stethoscope"],
  medico: ["stethoscope", "syringe", "pill", "activity"],
  saude: ["stethoscope", "heart", "activity", "pill"],
  cabelo: ["scissors", "brush"],
  barba: ["scissors", "crown"],
  barbearia: ["scissors", "crown"],
  tesoura: ["scissors"],
  unha: ["palette", "paintbrush", "gem"],
  manicure: ["palette", "paintbrush", "gem"],
  maquiagem: ["paintbrush", "palette", "sparkles"],
  foto: ["camera", "video"],
  fotografia: ["camera"],
  musica: ["music", "mic", "headphones"],
  som: ["music", "mic", "headphones"],
  academia: ["dumbbell", "target", "trophy", "flame", "activity"],
  halter: ["dumbbell"],
  personal: ["dumbbell", "target", "user"],
  carro: ["car", "wrench", "settings", "truck"],
  mecanica: ["wrench", "car", "cog", "settings"],
  moto: ["bike", "car"],
  comida: ["utensils", "chef-hat", "pizza", "coffee"],
  restaurante: ["utensils", "chef-hat", "wine", "pizza"],
  cafe: ["coffee"],
  pet: ["dog", "footprints"],
  cachorro: ["dog", "footprints"],
  eletricista: ["plug", "zap", "battery"],
  impressora: ["printer"],
  tv: ["tv"],
  stove: ["cooking-pot"],
  fogao: ["cooking-pot", "flame"],
  cooktop: ["cooking-pot"],
  forno: ["oven"],
  oven: ["oven"],
  microwave: ["microwave"],
  microondas: ["microwave"],
  fan: ["fan"],
  ventilador: ["fan"],
  sofa: ["sofa"],
  estofado: ["sofa"],
  estofados: ["sofa"],
  bed: ["bed"],
  cama: ["bed"],
  colchao: ["bed"],
  thermometer: ["thermometer"],
  waves: ["waves"],
  piscina: ["waves"],
  bug: ["bug"],
  dedetizacao: ["bug"],
};

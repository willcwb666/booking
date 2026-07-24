import {
  countSystemSegments,
  createSystemSegmentRecord,
} from "./system-segment-db";

const DEFAULT_SEGMENTS = [
  { code: "MECHANIC", label: "🛠️ Oficina Mecânica & Auto", description: "Oficinas, autocenters, funilaria e centro automotivo", displayOrder: 1 },
  { code: "BARBER", label: "💈 Barbearia", description: "Barbearias, cortes masculinos e serviços estéticos", displayOrder: 2 },
  { code: "HOME_CLEANING", label: "🧹 Limpeza Residencial & Faxina", description: "Diaristas, faxinas residenciais e limpeza pós-obra", displayOrder: 3 },
  { code: "PET_GROOMER", label: "🐶 Pet Shop & Groomer", description: "Banho, tosa, corte de unhas e cuidados pet", displayOrder: 4 },
  { code: "HAIR_SALON", label: "💅 Salão de Beleza & Estética", description: "Cabeleireiros, manicures, pedicures e estética", displayOrder: 5 },
  { code: "CAR_WASH", label: "🚗 Lava-Rápido & Estética Automotiva", description: "Lavação simples, polimento e higienização", displayOrder: 6 },
  { code: "LAWN_CARE", label: "🌿 Jardinagem & Paisagismo", description: "Manutenção de jardins, gramados e podas", displayOrder: 7 },
  { code: "POOL_CLEANING", label: "🏊 Limpeza de Piscinas", description: "Tratamento químico, aspiração e manutenção de piscinas", displayOrder: 8 },
  { code: "PHOTOGRAPHER", label: "📷 Fotografia & Eventos", description: "Ensaio fotográfico, cobertura de eventos e sessões", displayOrder: 9 },
  { code: "OTHER", label: "⚙️ Outro Prestador de Serviços", description: "Serviços em geral e consultorias", displayOrder: 10 },
];

export async function ensureDefaultSegmentsSeeded() {
  try {
    const count = await countSystemSegments();
    if (count > 0) return;

    for (const seg of DEFAULT_SEGMENTS) {
      await createSystemSegmentRecord(seg);
    }
  } catch (err) {
    console.error("Erro ao popular segmentos padrão:", err);
  }
}

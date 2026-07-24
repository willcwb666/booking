import {
  countSystemPresets,
  createSystemPresetRecord,
} from "./system-preset-db";

type PresetItem = {
  businessType: string;
  title: string;
  description: string;
  defaultPrice: number;
  durationMin: number;
  isExtra: boolean;
  parentTitle?: string;
  displayOrder: number;
};

const DEFAULT_PRESETS: PresetItem[] = [
  // 🛠️ MECHANIC
  { businessType: "MECHANIC", title: "Revisão Geral 10.000 km", description: "Verificação de 30 itens de segurança, fluidos e suspensão", defaultPrice: 250, durationMin: 45, isExtra: false, displayOrder: 1 },
  { businessType: "MECHANIC", title: "Filtro de Ar Condicionado", description: "Troca do filtro higiênico da cabine", defaultPrice: 45, durationMin: 15, isExtra: true, parentTitle: "Revisão Geral 10.000 km", displayOrder: 2 },
  { businessType: "MECHANIC", title: "Higienização de Ar Condicionado", description: "Aplicação de spray antibacteriano na tubulação", defaultPrice: 60, durationMin: 20, isExtra: true, parentTitle: "Revisão Geral 10.000 km", displayOrder: 3 },
  { businessType: "MECHANIC", title: "Alinhamento 3D + Balanceamento", description: "Ajuste de geometria 3D e balanceamento de rodas", defaultPrice: 120, durationMin: 30, isExtra: false, displayOrder: 4 },
  { businessType: "MECHANIC", title: "Rodízio de Pneus", description: "Troca de posição dos pneus dianteiros e traseiros", defaultPrice: 30, durationMin: 15, isExtra: true, parentTitle: "Alinhamento 3D + Balanceamento", displayOrder: 5 },
  { businessType: "MECHANIC", title: "Troca de Pastilhas de Freio", description: "Substituição das pastilhas de freio dianteiras", defaultPrice: 180, durationMin: 40, isExtra: false, displayOrder: 6 },

  // 💈 BARBER
  { businessType: "BARBER", title: "Corte Degradê / Social", description: "Corte moderno ou clássico com acabamento na máquina e tesoura", defaultPrice: 45, durationMin: 30, isExtra: false, displayOrder: 1 },
  { businessType: "BARBER", title: "Sobrancelha Navalhada", description: "Alinhamento de sobrancelhas com lâmina", defaultPrice: 15, durationMin: 10, isExtra: true, parentTitle: "Corte Degradê / Social", displayOrder: 2 },
  { businessType: "BARBER", title: "Barba Terápica com Panno Caldo", description: "Modelagem de barba com toalha quente e óleos essenciais", defaultPrice: 40, durationMin: 25, isExtra: false, displayOrder: 3 },
  { businessType: "BARBER", title: "Combo Corte + Barba Terápica", description: "Corte de cabelo completo + barba com panno caldo e massagem", defaultPrice: 80, durationMin: 50, isExtra: false, displayOrder: 4 },
  { businessType: "BARBER", title: "Massagem Capilar + Pigmentação", description: "Aplicação de pigmento para realçar o acabamento", defaultPrice: 30, durationMin: 15, isExtra: true, parentTitle: "Combo Corte + Barba Terápica", displayOrder: 5 },

  // 🧹 HOME_CLEANING
  { businessType: "HOME_CLEANING", title: "Faxina Residencial Completa", description: "Limpeza detalhada de salas, quartos, banheiros e cozinha", defaultPrice: 180, durationMin: 240, isExtra: false, displayOrder: 1 },
  { businessType: "HOME_CLEANING", title: "Passadoria de Roupas (15 pçs)", description: "Passar roupas sociais e de uso diário", defaultPrice: 60, durationMin: 60, isExtra: true, parentTitle: "Faxina Residencial Completa", displayOrder: 2 },
  { businessType: "HOME_CLEANING", title: "Limpeza Interna de Geladeira/Forno", description: "Higienização interna completa do eletrodoméstico", defaultPrice: 40, durationMin: 30, isExtra: true, parentTitle: "Faxina Residencial Completa", displayOrder: 3 },
  { businessType: "HOME_CLEANING", title: "Limpeza Pós-Obra", description: "Remoção de resíduos pesados e higienização pós-reforma", defaultPrice: 350, durationMin: 360, isExtra: false, displayOrder: 4 },

  // 🐶 PET_GROOMER
  { businessType: "PET_GROOMER", title: "Banho + Tosa Higiênica (Porte Médio)", description: "Banho quentinho, secagem, tosa higiênica e perfume pet", defaultPrice: 95, durationMin: 60, isExtra: false, displayOrder: 1 },
  { businessType: "PET_GROOMER", title: "Corte de Unhas + Hidratação de Pelagem", description: "Corte das garras e máscara hidratante nos pelos", defaultPrice: 35, durationMin: 20, isExtra: true, parentTitle: "Banho + Tosa Higiênica (Porte Médio)", displayOrder: 2 },
  { businessType: "PET_GROOMER", title: "Escovação Dentes Pet", description: "Limpeza bucal preventiva com creme dental próprio", defaultPrice: 20, durationMin: 10, isExtra: true, parentTitle: "Banho + Tosa Higiênica (Porte Médio)", displayOrder: 3 },

  // 💅 HAIR_SALON
  { businessType: "HAIR_SALON", title: "Escova + Hidratação Profunda", description: "Lavagem especial, máscara de nutrição e escova modelada", defaultPrice: 120, durationMin: 60, isExtra: false, displayOrder: 1 },
  { businessType: "HAIR_SALON", title: "Manicure e Pedicure", description: "Cutilagem, esmaltação e hidratação das mãos e pés", defaultPrice: 50, durationMin: 45, isExtra: true, parentTitle: "Escova + Hidratação Profunda", displayOrder: 2 },

  // 🚗 CAR_WASH
  { businessType: "CAR_WASH", title: "Lavagem Completa + Cera Líquida", description: "Lavação externa detalhada, aspiração interna e aplicação de cera", defaultPrice: 70, durationMin: 45, isExtra: false, displayOrder: 1 },
  { businessType: "CAR_WASH", title: "Higienização Interna de Bancos", description: "Extração profunda de sujeiras e odores dos estofados", defaultPrice: 150, durationMin: 90, isExtra: true, parentTitle: "Lavagem Completa + Cera Líquida", displayOrder: 2 },

  // 🌿 LAWN_CARE
  { businessType: "LAWN_CARE", title: "Manutenção de Jardim Residencial", description: "Corte de grama, limpeza de canteiros e retirada de ervas daninhas", defaultPrice: 150, durationMin: 120, isExtra: false, displayOrder: 1 },

  // 🏊 POOL_CLEANING
  { businessType: "POOL_CLEANING", title: "Tratamento Químico e Aspiração", description: "Medição de pH, cloração, aspiração de fundo e escovação", defaultPrice: 140, durationMin: 60, isExtra: false, displayOrder: 1 },

  // 📷 PHOTOGRAPHER
  { businessType: "PHOTOGRAPHER", title: "Ensaio Fotográfico Externo (1h)", description: "Sessão fotográfica em localização externa com 20 fotos tratadas", defaultPrice: 350, durationMin: 60, isExtra: false, displayOrder: 1 },

  // ⚙️ OTHER
  { businessType: "OTHER", title: "Atendimento / Consultoria Padrão", description: "Sessão de atendimento ou consultoria técnica", defaultPrice: 100, durationMin: 60, isExtra: false, displayOrder: 1 },
];

/**
 * Garante que existam presets iniciais de demonstração no banco de dados.
 * Se a tabela system_preset estiver vazia, preenche automaticamente com os modelos acima.
 */
export async function ensureDefaultPresetsSeeded() {
  try {
    const count = await countSystemPresets();
    if (count > 0) return; // Já populado!

    for (const item of DEFAULT_PRESETS) {
      await createSystemPresetRecord({
        businessType: item.businessType,
        title: item.title,
        description: item.description,
        defaultPrice: item.defaultPrice,
        durationMin: item.durationMin,
        isExtra: item.isExtra,
        parentTitle: item.parentTitle,
        displayOrder: item.displayOrder,
        isActive: true,
      });
    }
  } catch (err) {
    console.error("Erro ao alimentar presets padrão:", err);
  }
}

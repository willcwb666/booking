import { describe, expect, it } from "vitest";
import {
  findOffPeakDiscount,
  isValidWindow,
  toMinutes,
  weekdayOf,
  suggestOffPeakWindows,
  WEEKDAY_LABELS,
  type OffPeakWindow,
} from "./off-peak";

const win = (over: Partial<OffPeakWindow> = {}): OffPeakWindow => ({
  id: "w1",
  label: "Happy Hour",
  weekday: 2, // terça
  startTime: "09:00",
  endTime: "12:00",
  discountPercentage: 15,
  isActive: true,
  ...over,
});

/** 2026-08-18 é uma terça-feira. */
const TERCA = "2026-08-18";
const QUARTA = "2026-08-19";

describe("toMinutes", () => {
  it("converte horários válidos", () => {
    expect(toMinutes("00:00")).toBe(0);
    expect(toMinutes("09:30")).toBe(570);
    expect(toMinutes("23:59")).toBe(1439);
  });

  it("recusa lixo em vez de devolver NaN", () => {
    // NaN aqui vazaria para a comparação de faixa e o desconto seria aplicado
    // ou negado por acidente.
    for (const bad of ["", "9h", "25:00", "12:60", "abc", "12:"]) {
      expect(toMinutes(bad)).toBeNull();
    }
  });
});

describe("weekdayOf", () => {
  it("não escorrega de dia por causa de fuso", () => {
    // `new Date("2026-08-18").getDay()` devolve segunda em fuso negativo —
    // e o usuário está no Colorado (UTC-6). O cálculo é em UTC de propósito.
    expect(weekdayOf(TERCA)).toBe(2);
    expect(weekdayOf(QUARTA)).toBe(3);
    expect(weekdayOf("2026-08-16")).toBe(0); // domingo
  });

  it("recusa formato inválido", () => {
    expect(weekdayOf("18/08/2026")).toBeNull();
    expect(weekdayOf("")).toBeNull();
  });
});

describe("isValidWindow", () => {
  it("aceita uma janela normal", () => {
    expect(isValidWindow(win())).toBe(true);
  });

  it("recusa janela que termina antes de começar", () => {
    expect(isValidWindow(win({ startTime: "12:00", endTime: "09:00" }))).toBe(false);
  });

  it("recusa janela de duração zero", () => {
    expect(isValidWindow(win({ startTime: "09:00", endTime: "09:00" }))).toBe(false);
  });

  it("recusa desconto fora da faixa", () => {
    expect(isValidWindow(win({ discountPercentage: 0 }))).toBe(false);
    expect(isValidWindow(win({ discountPercentage: 101 }))).toBe(false);
    expect(isValidWindow(win({ discountPercentage: -5 }))).toBe(false);
  });

  it("recusa dia da semana fora de 0–6", () => {
    expect(isValidWindow(win({ weekday: 7 }))).toBe(false);
    expect(isValidWindow(win({ weekday: -1 }))).toBe(false);
  });
});

describe("findOffPeakDiscount", () => {
  it("aplica o desconto dentro da janela", () => {
    const r = findOffPeakDiscount([win()], TERCA, "10:00", 100);
    expect(r?.discountPercentage).toBe(15);
    expect(r?.discountAmount).toBe(15);
    expect(r?.finalPrice).toBe(85);
  });

  it("não aplica em outro dia da semana", () => {
    expect(findOffPeakDiscount([win()], QUARTA, "10:00", 100)).toBeNull();
  });

  it("início é inclusivo, fim é exclusivo", () => {
    // Sem o fim exclusivo, janelas encostadas (09–12 e 12–15) se sobreporiam
    // exatamente no minuto de virada.
    expect(findOffPeakDiscount([win()], TERCA, "09:00", 100)).not.toBeNull();
    expect(findOffPeakDiscount([win()], TERCA, "11:59", 100)).not.toBeNull();
    expect(findOffPeakDiscount([win()], TERCA, "12:00", 100)).toBeNull();
  });

  it("janela desativada não vale", () => {
    expect(findOffPeakDiscount([win({ isActive: false })], TERCA, "10:00", 100)).toBeNull();
  });

  it("janela inválida é ignorada em vez de derrubar o cálculo", () => {
    // Dado ruim no banco não pode impedir o cliente de agendar.
    const bad = win({ id: "bad", startTime: "12:00", endTime: "09:00" });
    expect(findOffPeakDiscount([bad], TERCA, "10:00", 100)).toBeNull();
    expect(findOffPeakDiscount([bad, win()], TERCA, "10:00", 100)?.discountPercentage).toBe(15);
  });

  it("com janelas sobrepostas, vence o MAIOR desconto", () => {
    // O cliente viu um preço anunciado e é esse que ele paga. Vencer a primeira
    // cadastrada faria o preço depender da ordem de inserção no banco.
    const a = win({ id: "a", discountPercentage: 10 });
    const b = win({ id: "b", discountPercentage: 25, startTime: "10:00", endTime: "11:00" });
    const r = findOffPeakDiscount([a, b], TERCA, "10:30", 100);
    expect(r?.window.id).toBe("b");
    expect(r?.discountPercentage).toBe(25);
  });

  it("o resultado não depende da ordem da lista", () => {
    const a = win({ id: "a", discountPercentage: 10 });
    const b = win({ id: "b", discountPercentage: 25 });
    expect(findOffPeakDiscount([a, b], TERCA, "10:00", 100)?.window.id).toBe("b");
    expect(findOffPeakDiscount([b, a], TERCA, "10:00", 100)?.window.id).toBe("b");
  });

  it("arredonda o dinheiro em duas casas", () => {
    // 33% de 89,90 dá 29,667. Meio centavo propagado até o Stripe vira erro
    // de cobrança.
    const r = findOffPeakDiscount([win({ discountPercentage: 33 })], TERCA, "10:00", 89.9);
    expect(r?.discountAmount).toBe(29.67);
    expect(r?.finalPrice).toBe(60.23);
  });

  it("preço zero ou negativo não gera desconto", () => {
    expect(findOffPeakDiscount([win()], TERCA, "10:00", 0)).toBeNull();
    expect(findOffPeakDiscount([win()], TERCA, "10:00", -50)).toBeNull();
  });

  it("lista vazia devolve nulo sem quebrar", () => {
    expect(findOffPeakDiscount([], TERCA, "10:00", 100)).toBeNull();
  });
});

describe("suggestOffPeakWindows", () => {
  const grid = (cells: Array<[number, number, number]>) => {
    const list = cells.map(([weekday, hour, bookings]) => ({
      weekday,
      weekdayLabel: WEEKDAY_LABELS[weekday],
      hour,
      bookings,
    }));
    return {
      cells: list,
      max: list.reduce((m, c) => Math.max(m, c.bookings), 0),
      total: list.reduce((s, c) => s + c.bookings, 0),
      daysAnalyzed: 90,
    };
  };

  it("empresa sem histórico não recebe sugestão", () => {
    // Sugerir desconto para quem ainda não tem movimento seria inventar um
    // padrão a partir de nada.
    expect(suggestOffPeakWindows(grid([]))).toEqual([]);
    expect(suggestOffPeakWindows(grid([[2, 9, 0]]))).toEqual([]);
  });

  it("encontra a faixa contígua vazia ao lado de uma cheia", () => {
    const g = grid([
      [2, 9, 1],
      [2, 10, 1],
      [2, 11, 2],
      [6, 9, 20], // sábado lotado define a escala
      [6, 10, 18],
    ]);
    const [s] = suggestOffPeakWindows(g);
    expect(s.weekday).toBe(2);
    expect(s.startHour).toBe(9);
    expect(s.endHour).toBe(12);
  });

  it("horas não contíguas não viram uma janela só", () => {
    // 9h e 14h calmas não formam "das 9h às 15h" — o meio está cheio.
    const g = grid([
      [3, 9, 1],
      [3, 10, 20],
      [3, 14, 1],
      [3, 15, 1],
    ]);
    const out = suggestOffPeakWindows(g);
    expect(out.every((s) => !(s.startHour === 9 && s.endHour > 11))).toBe(true);
    expect(out.some((s) => s.startHour === 14 && s.endHour === 16)).toBe(true);
  });

  it("faixa curta demais é descartada", () => {
    // Uma hora solta não vale uma campanha; o cliente não muda a rotina por
    // uma janela de sessenta minutos.
    const g = grid([
      [3, 9, 1],
      [3, 10, 20],
    ]);
    expect(suggestOffPeakWindows(g)).toEqual([]);
  });

  it("o corte é relativo à própria empresa, não absoluto", () => {
    // Cinco agendamentos é vazio para um salão grande e cheio para um
    // autônomo. Mesma forma de grade, escalas diferentes, resultado igual.
    const pequeno = grid([
      [2, 9, 1],
      [2, 10, 1],
      [6, 9, 4],
    ]);
    const grande = grid([
      [2, 9, 25],
      [2, 10, 25],
      [6, 9, 100],
    ]);
    expect(suggestOffPeakWindows(pequeno)[0]?.weekday).toBe(2);
    expect(suggestOffPeakWindows(grande)[0]?.weekday).toBe(2);
  });

  it("ordena do mais vazio para o menos vazio", () => {
    const g = grid([
      [1, 9, 3],
      [1, 10, 3],
      [2, 9, 0],
      [2, 10, 1],
      [6, 9, 30],
    ]);
    const out = suggestOffPeakWindows(g);
    expect(out[0].bookings).toBeLessThanOrEqual(out[1].bookings);
  });
});

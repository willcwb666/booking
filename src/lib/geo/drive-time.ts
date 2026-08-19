import { calculateDistanceMeters, type GeoCoordinate } from "./haversine";

/**
 * Buffer de deslocamento entre atendimentos consecutivos.
 *
 * ─── A dor ───────────────────────────────────────────────────────────────────
 *
 * Serviço a domicílio — mecânico móvel, diarista, banho e tosa móvel — hoje
 * agenda o cliente das 14h no bairro A e o das 15h no bairro B como se o
 * deslocamento fosse instantâneo. O atraso está marcado na agenda desde o
 * momento em que os dois foram aceitos.
 *
 * ─── Por que linha reta, e por que isso basta ────────────────────────────────
 *
 * A distância aqui é a haversine: a reta sobre a superfície da Terra, não o
 * caminho pelas ruas. O trajeto real é sempre MAIOR — em malha urbana, algo
 * entre 20% e 40% maior. Isso não é um defeito escondido: o fator
 * `minutosPorKm` é calibrado sobre a reta e já absorve o desvio. Três minutos
 * por quilômetro em linha reta equivalem a bem menos de 20 km/h de velocidade
 * real de rua, que é o número honesto para trânsito urbano com estacionamento.
 *
 * A alternativa — Google Distance Matrix — custa por requisição, exige conta
 * de faturamento e tem um problema que preço nenhum resolve: o trânsito no
 * momento em que se agenda não é o trânsito no momento do atendimento.
 * Consultar a API na hora de marcar dá precisão falsa. Faz sentido como
 * refinamento pago, não como base.
 *
 * ─── O viés ──────────────────────────────────────────────────────────────────
 *
 * Quando a estimativa erra, ela erra para o lado conservador: reserva tempo
 * demais em vez de tempo de menos. Um "indisponível" errado custa um horário
 * vendável; um "disponível" errado custa um cliente esperando em casa com o
 * profissional preso no trânsito. Os dois erros não têm o mesmo preço.
 */

export type Stop = {
  /** "HH:MM" */
  startTime: string;
  /** "HH:MM" */
  endTime: string;
  latitude: number | null;
  longitude: number | null;
};

export type TravelBlock = {
  /** "HH:MM" */
  startTime: string;
  /** "HH:MM" */
  endTime: string;
  /** Minutos de viagem estimados para o trecho (antes de qualquer corte). */
  travelMinutes: number;
  /** Distância em linha reta entre os dois atendimentos, em metros. */
  distanceMeters: number;
  /**
   * A janela entre os dois atendimentos é menor que a viagem estimada.
   *
   * Não impede nada — os dois já estão marcados. Serve para o bloco aparecer
   * na agenda dizendo que aquele par não fecha, que é a única forma do dono
   * descobrir antes do cliente.
   */
  insufficient: boolean;
};

export type DriveTimeOptions = {
  minutesPerKm: number;
  maxMinutes: number;
};

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function toTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function hasCoords(stop: Stop): stop is Stop & GeoCoordinate {
  return (
    typeof stop.latitude === "number" &&
    typeof stop.longitude === "number" &&
    Number.isFinite(stop.latitude) &&
    Number.isFinite(stop.longitude)
  );
}

/**
 * Minutos de viagem entre dois pontos, já com teto aplicado.
 *
 * O teto existe por causa do geocodificador, não do trânsito: quando ele não
 * encontra a rua, costuma devolver o centroide do município — às vezes do
 * município errado. Uma reta de trezentos quilômetros viraria um bloqueio de
 * quinze horas e apagaria o dia inteiro da grade. Com teto, dado ruim vira
 * erro limitado em vez de agenda destruída.
 */
export function travelMinutesBetween(
  from: GeoCoordinate,
  to: GeoCoordinate,
  options: DriveTimeOptions
): { minutes: number; distanceMeters: number } {
  const distanceMeters = calculateDistanceMeters(from, to);
  const raw = (distanceMeters / 1000) * options.minutesPerKm;
  // Arredonda para cima: meio minuto de viagem que vira zero é uma reserva
  // que não existe, e a soma desses zeros é o atraso do fim do dia.
  const minutes = Math.min(Math.ceil(raw), Math.max(0, options.maxMinutes));
  return { minutes, distanceMeters };
}

/**
 * Bloqueios de deslocamento de um profissional em um dia.
 *
 * ─── Por que a reserva é nas DUAS pontas da janela ───────────────────────────
 *
 * Entre o atendimento A e o B há uma janela livre. Encaixar um cliente novo
 * ali exige duas viagens que ainda não existem: A → novo e novo → B. Como o
 * endereço do cliente novo é desconhecido no momento em que ele escolhe o
 * horário — ele digita o endereço depois de escolher —, não há o que calcular.
 *
 * A aproximação é reservar `viagem(A,B)` no início da janela e outro tanto no
 * fim, deixando livre só o miolo. Quem couber no miolo tem folga real dos dois
 * lados. Quando a janela é menor que duas viagens, as duas reservas se
 * encontram e a janela inteira fecha — que é a resposta certa: não cabe
 * ninguém entre dois atendimentos que já se espremem.
 *
 * Uma reserva só na frente deixaria vendável o horário colado em B, e quem o
 * comprasse chegaria em B atrasado por construção.
 *
 * ─── Distância zero não vira bloqueio ────────────────────────────────────────
 *
 * Dois banhos no mesmo endereço, dois carros na mesma garagem, dois serviços
 * seguidos para a mesma família: a viagem é de zero metro e não existe motivo
 * para reservar nada. Sem essa regra, o recurso puniria justamente o
 * agendamento mais lucrativo do dia.
 */
export function computeTravelBlocks(
  stops: Stop[],
  options: DriveTimeOptions
): TravelBlock[] {
  if (options.minutesPerKm <= 0 || options.maxMinutes <= 0) return [];

  const ordered = [...stops].sort((a, b) => a.startTime.localeCompare(b.startTime));
  const blocks: TravelBlock[] = [];

  for (let i = 0; i < ordered.length - 1; i++) {
    const from = ordered[i];
    const to = ordered[i + 1];

    // Sem coordenada dos dois lados não há distância. Chutar seria pior que
    // não bloquear: um bloqueio inventado tira horário vendável da grade sem
    // que ninguém consiga explicar por quê.
    if (!hasCoords(from) || !hasCoords(to)) continue;

    const gapStart = toMinutes(from.endTime);
    const gapEnd = toMinutes(to.startTime);
    // Atendimentos sobrepostos (dois recursos, um profissional na agenda) não
    // têm janela entre si.
    if (gapEnd <= gapStart) continue;

    const { minutes, distanceMeters } = travelMinutesBetween(from, to, options);
    if (minutes <= 0) continue;

    const gap = gapEnd - gapStart;
    const insufficient = minutes > gap;

    if (minutes * 2 >= gap) {
      // As duas reservas se tocam: a janela inteira vira um bloco só. Duas
      // metades encostadas seriam a mesma informação ocupando duas linhas da
      // agenda.
      blocks.push({
        startTime: toTime(gapStart),
        endTime: toTime(gapEnd),
        travelMinutes: minutes,
        distanceMeters,
        insufficient,
      });
      continue;
    }

    blocks.push({
      startTime: toTime(gapStart),
      endTime: toTime(gapStart + minutes),
      travelMinutes: minutes,
      distanceMeters,
      insufficient,
    });
    blocks.push({
      startTime: toTime(gapEnd - minutes),
      endTime: toTime(gapEnd),
      travelMinutes: minutes,
      distanceMeters,
      insufficient,
    });
  }

  return blocks;
}

/**
 * Título do bloco na agenda.
 *
 * Leva a distância porque o dono precisa poder discordar do número. "Reservado"
 * sozinho é uma ordem sem argumento; "12 min · 4.1 km" é uma conta que ele
 * confere de cabeça, e se estiver errada ele ajusta o minutos-por-km em vez de
 * desligar o recurso inteiro.
 */
export function travelBlockTitle(block: TravelBlock, formatDistance: (m: number) => string): string {
  const base = `Deslocamento · ${block.travelMinutes} min · ${formatDistance(block.distanceMeters)}`;
  return block.insufficient ? `${base} · não fecha` : base;
}

/**
 * A decisão da cerca de check-in, sem I/O.
 *
 * ─── Por que virou função ────────────────────────────────────────────────────
 *
 * A regra vivia no meio de `performSmartCheckinAction`, num `if` de cinco
 * condições, e escondia um buraco: quando o navegador não mandava coordenadas,
 * o bloco inteiro era pulado e o check-in passava. Ou seja, negar a permissão
 * de localização era o jeito mais fácil de burlar a cerca — e o cliente do
 * próprio produto fazia isso sozinho, porque o código chamava a action sem
 * coordenadas assim que o GPS falhava.
 *
 * Uma verificação que o verificado pode dispensar não é verificação.
 *
 * ─── O que uma cerca de GPS vale ─────────────────────────────────────────────
 *
 * A posição é informada pelo navegador, e navegador se falsifica com uma linha
 * no console. Isto é atrito honesto contra o check-in feito do sofá, não prova
 * de presença — e é por isso que confirmar a chegada não libera dinheiro.
 */

/** Código do módulo licenciado que abre a configuração da cerca. */
export const CHECKIN_MODULE = "checkin_geofencing";

export type GeofenceDecision =
  /** Empresa sem coordenadas: não há cerca a aplicar. */
  | { outcome: "not_configured" }
  /** Cerca ativa e o cliente está dentro. */
  | { outcome: "inside"; distanceMeters: number }
  /** Cerca ativa e o cliente está longe demais. */
  | { outcome: "outside"; distanceMeters: number; radiusMeters: number }
  /** Cerca ativa e o cliente não informou onde está. */
  | { outcome: "location_required"; radiusMeters: number };

export type Coordinates = { latitude: number; longitude: number };

function isFinitePair(c: Coordinates | null | undefined): c is Coordinates {
  return (
    !!c &&
    typeof c.latitude === "number" &&
    typeof c.longitude === "number" &&
    Number.isFinite(c.latitude) &&
    Number.isFinite(c.longitude)
  );
}

/**
 * Decide o check-in a partir da configuração da empresa e da posição informada.
 *
 * `distance` é injetada para a regra continuar pura — quem chama passa a
 * haversine que já existe.
 */
export function evaluateGeofence(params: {
  companyLatitude: number | null;
  companyLongitude: number | null;
  radiusMeters: number;
  clientCoords: Coordinates | null | undefined;
  distance: (a: Coordinates, b: Coordinates) => number;
}): GeofenceDecision {
  const company =
    params.companyLatitude !== null && params.companyLongitude !== null
      ? { latitude: params.companyLatitude, longitude: params.companyLongitude }
      : null;

  // Sem coordenadas da empresa não existe cerca. É o estado de toda empresa até
  // alguém abrir a tela de configuração — e continuar deixando passar é o
  // certo: a alternativa seria reprovar todo mundo por falta de cadastro.
  if (!isFinitePair(company)) return { outcome: "not_configured" };

  // Com cerca configurada, não informar a posição é recusa, não passe livre.
  if (!isFinitePair(params.clientCoords)) {
    return { outcome: "location_required", radiusMeters: params.radiusMeters };
  }

  const distanceMeters = params.distance(params.clientCoords, company);

  // Raio inválido no cadastro não pode reprovar quem chegou: sem número
  // confiável, não há régua, e sem régua não se reprova ninguém.
  if (!Number.isFinite(params.radiusMeters) || params.radiusMeters <= 0) {
    return { outcome: "inside", distanceMeters };
  }

  if (distanceMeters > params.radiusMeters) {
    return { outcome: "outside", distanceMeters, radiusMeters: params.radiusMeters };
  }

  return { outcome: "inside", distanceMeters };
}

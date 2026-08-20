import { describe, expect, it } from "vitest";
import { evaluateGeofence } from "./checkin-geofence";
import { calculateDistanceMeters } from "./geo/haversine";

const SALAO = { latitude: -25.4284, longitude: -49.2733 };

const base = {
  companyLatitude: SALAO.latitude,
  companyLongitude: SALAO.longitude,
  radiusMeters: 250,
  distance: calculateDistanceMeters,
};

describe("evaluateGeofence", () => {
  it("empresa sem coordenadas não tem cerca", () => {
    // É o estado de toda empresa até alguém abrir a tela de configuração.
    // Reprovar por falta de cadastro seria punir o cliente por algo que ele
    // não controla.
    expect(
      evaluateGeofence({
        ...base,
        companyLatitude: null,
        companyLongitude: null,
        clientCoords: SALAO,
      }).outcome
    ).toBe("not_configured");
  });

  it("meia coordenada também não é cerca", () => {
    expect(
      evaluateGeofence({ ...base, companyLongitude: null, clientCoords: SALAO }).outcome
    ).toBe("not_configured");
  });

  it("cliente na porta entra", () => {
    // ~22 m ao norte.
    const naPorta = { latitude: SALAO.latitude + 0.0002, longitude: SALAO.longitude };
    const d = evaluateGeofence({ ...base, clientCoords: naPorta });
    expect(d.outcome).toBe("inside");
  });

  it("cliente longe é recusado, com a distância na resposta", () => {
    // ~2 km ao norte, raio de 250 m.
    const longe = { latitude: SALAO.latitude + 0.018, longitude: SALAO.longitude };
    const d = evaluateGeofence({ ...base, clientCoords: longe });
    expect(d.outcome).toBe("outside");
    if (d.outcome === "outside") {
      expect(d.distanceMeters).toBeGreaterThan(1900);
      expect(d.radiusMeters).toBe(250);
    }
  });

  describe("o buraco que isto fecha", () => {
    /**
     * Com cerca configurada, NÃO informar a posição precisa ser recusa.
     *
     * Antes, o bloco inteiro da verificação era pulado quando `clientCoords`
     * vinha vazio — e o próprio cliente do produto chamava a action sem
     * coordenadas assim que o GPS falhava. Negar a permissão de localização era
     * o jeito mais fácil de burlar a cerca, e ele estava a um clique.
     */
    it("sem posição informada, recusa", () => {
      for (const coords of [undefined, null]) {
        expect(evaluateGeofence({ ...base, clientCoords: coords }).outcome).toBe(
          "location_required"
        );
      }
    });

    it("posição malformada conta como não informada", () => {
      const lixo = [
        { latitude: Number.NaN, longitude: 0 },
        { latitude: 0, longitude: Number.POSITIVE_INFINITY },
        { latitude: "-25.4" as unknown as number, longitude: -49.2 },
      ];
      for (const c of lixo) {
        expect(evaluateGeofence({ ...base, clientCoords: c }).outcome).toBe("location_required");
      }
    });

    it("sem cerca configurada, posição ausente continua passando", () => {
      // A recusa só existe onde há régua. Sem coordenadas da empresa, exigir
      // GPS do cliente seria inventar uma barreira que ninguém pediu.
      expect(
        evaluateGeofence({
          ...base,
          companyLatitude: null,
          companyLongitude: null,
          clientCoords: undefined,
        }).outcome
      ).toBe("not_configured");
    });
  });

  it("raio inválido não reprova ninguém", () => {
    // Sem número confiável não há régua, e sem régua não se reprova.
    const longe = { latitude: SALAO.latitude + 0.018, longitude: SALAO.longitude };
    for (const radiusMeters of [0, -100, Number.NaN]) {
      expect(evaluateGeofence({ ...base, radiusMeters, clientCoords: longe }).outcome).toBe(
        "inside"
      );
    }
  });
});

/**
 * Motor Matemático Geodésico - Cálculo de Distância na Superfície Terrestre
 * Utiliza a Fórmula de Haversine com o raio médio da Terra (R = 6.371.000 metros).
 */

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

/**
 * Calcula a distância em metros entre duas coordenadas geográficas.
 * @returns Distância em metros (arredondada para 1 casa decimal).
 */
export function calculateDistanceMeters(
  pointA: GeoCoordinate,
  pointB: GeoCoordinate
): number {
  const R = 6371000; // Raio da Terra em metros
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const lat1 = toRad(pointA.latitude);
  const lat2 = toRad(pointB.latitude);
  const deltaLat = toRad(pointB.latitude - pointA.latitude);
  const deltaLon = toRad(pointB.longitude - pointA.longitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10;
}

/**
 * Formata a distância de forma amigável para exibição ao usuário.
 * Ex: "45 m" ou "1.2 km"
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

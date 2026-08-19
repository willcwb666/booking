import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Kreator — Agendamentos online e orçamentos para prestadores de serviços";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0c0a09 0%, #1c1917 50%, #292524 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "80px",
          fontFamily: "sans-serif",
          color: "white",
        }}
      >
        {/* Top Header / Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              fontWeight: "900",
              color: "white",
            }}
          >
            K
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "28px", fontWeight: "900", letterSpacing: "-0.03em" }}>
              Kreator
            </span>
            <span style={{ fontSize: "14px", color: "#a8a29e", fontWeight: "600" }}>
              Plataforma de Agendamentos & Orçamentos
            </span>
          </div>
        </div>

        {/* Main Center Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "950px" }}>
          <div
            style={{
              fontSize: "62px",
              fontWeight: "900",
              letterSpacing: "-0.04em",
              lineHeight: 1.1,
              color: "#fafaf9",
            }}
          >
            Agendamentos simples.
            <br />
            <span style={{ color: "#10b981" }}>Orçamentos em segundos.</span>
          </div>
          <p
            style={{
              fontSize: "24px",
              color: "#d6d3d1",
              fontWeight: "500",
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            A plataforma completa para oficinas, barbearias, clínicas, diaristas e prestadores de serviços.
          </p>
        </div>

        {/* Bottom Feature Badges */}
        <div
          style={{
            display: "flex",
            gap: "24px",
            fontSize: "18px",
            fontWeight: "700",
            color: "#a8a29e",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "#10b981" }}>✓</span> Sem taxa por agendamento
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "#10b981" }}>✓</span> Notificações WhatsApp
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "#10b981" }}>✓</span> Configuração em 5 min
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

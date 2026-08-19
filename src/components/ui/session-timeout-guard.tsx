"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

type Props = {
  /** Limite de inatividade em segundos. `<= 0` desliga o guard. */
  idleSeconds: number;
  /** Antecedência do aviso, em segundos. */
  warnSeconds?: number;
};

const ACTIVITY_EVENTS = [
  "mousedown",
  "keydown",
  "wheel",
  "touchstart",
  "scroll",
  "pointermove",
] as const;

/** Chave compartilhada entre abas — atividade em uma aba conta para todas. */
const SHARED_ACTIVITY_KEY = "kb:last-activity";
/** Grava no localStorage no máximo a cada 5s (o evento dispara muito). */
const SHARED_WRITE_THROTTLE_MS = 5_000;
const TICK_MS = 2_000;

/**
 * Desloga automaticamente após X minutos sem interação.
 *
 * O servidor é a autoridade — ele revoga a sessão parada e o proxy redireciona
 * para o login. Este componente existe para (a) avisar antes de perder
 * trabalho, (b) encerrar de imediato em vez de deixar a tela aberta com dados
 * de clientes à mostra, e (c) mandar batimentos enquanto o usuário está
 * realmente trabalhando, para que digitar um formulário longo não seja
 * confundido com inatividade.
 */
export function SessionTimeoutGuard({ idleSeconds, warnSeconds = 60 }: Props) {
  const router = useRouter();
  // `null` até o primeiro efeito: ler o relógio durante o render seria impuro
  // (e daria valores diferentes entre render do servidor e hidratação).
  const lastActivityRef = useRef<number | null>(null);
  const lastSharedWriteRef = useRef<number>(0);
  const lastHeartbeatRef = useRef<number | null>(null);
  const loggingOutRef = useRef(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  const enabled = idleSeconds > 0;
  // Bate no servidor no máximo uma vez por minuto (ou metade da janela, se ela
  // for curta) — o suficiente para manter viva uma sessão em uso real.
  const heartbeatMs = Math.max(15_000, Math.min(60_000, (idleSeconds * 1000) / 2));

  const registerActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;

    if (now - lastSharedWriteRef.current > SHARED_WRITE_THROTTLE_MS) {
      lastSharedWriteRef.current = now;
      try {
        localStorage.setItem(SHARED_ACTIVITY_KEY, String(now));
      } catch {
        // localStorage indisponível (modo restrito) — o guard segue local à aba
      }
    }
  }, []);

  const forceLogout = useCallback(async () => {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    try {
      await signOut();
    } catch {
      // A sessão provavelmente já foi revogada no servidor — seguir mesmo assim
    }
    router.replace("/login?reason=idle");
  }, [router]);

  // Registra interação do usuário (nesta aba) e sincroniza entre abas
  useEffect(() => {
    if (!enabled) return;

    // Semente do relógio no cliente. Se outra aba já registrou atividade mais
    // recente, adota o valor dela em vez de reiniciar a contagem.
    const now = Date.now();
    let seed = now;
    try {
      const shared = Number(localStorage.getItem(SHARED_ACTIVITY_KEY));
      if (Number.isFinite(shared) && shared > 0 && shared <= now) seed = shared;
    } catch {
      // localStorage indisponível — segue com o relógio local
    }
    lastActivityRef.current = seed;
    lastHeartbeatRef.current = now;

    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, registerActivity, { passive: true });
    }

    function onStorage(e: StorageEvent) {
      if (e.key !== SHARED_ACTIVITY_KEY || !e.newValue) return;
      const ts = Number(e.newValue);
      if (Number.isFinite(ts) && ts > (lastActivityRef.current ?? 0)) {
        lastActivityRef.current = ts;
      }
    }
    window.addEventListener("storage", onStorage);

    return () => {
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, registerActivity);
      }
      window.removeEventListener("storage", onStorage);
    };
  }, [enabled, registerActivity]);

  // Relógio: decide entre avisar, bater no servidor ou encerrar
  useEffect(() => {
    if (!enabled) return;

    const id = window.setInterval(() => {
      // Ainda não semeado pelo efeito de atividade — nada a decidir neste tick
      if (lastActivityRef.current === null || lastHeartbeatRef.current === null) return;

      const now = Date.now();
      const idleMs = now - lastActivityRef.current;
      const secondsLeft = Math.ceil((idleSeconds * 1000 - idleMs) / 1000);

      if (secondsLeft <= 0) {
        setRemaining(0);
        void forceLogout();
        return;
      }

      setRemaining(secondsLeft <= warnSeconds ? secondsLeft : null);

      // Só manda batimento se houve interação desde o último — usuário parado
      // não deve manter a sessão viva.
      const activeSinceLastBeat = lastActivityRef.current > lastHeartbeatRef.current;
      if (activeSinceLastBeat && now - lastHeartbeatRef.current >= heartbeatMs) {
        lastHeartbeatRef.current = now;
        void fetch("/api/session/heartbeat", { method: "POST", cache: "no-store" })
          .then((res) => {
            // 401 = servidor já revogou (ex.: login em outra máquina derrubou
            // esta sessão). Encerra na hora em vez de esperar o próximo clique.
            if (res.status === 401) void forceLogout();
          })
          .catch(() => {
            // Rede fora: não desloga por isso — o servidor decide no retorno
          });
      }
    }, TICK_MS);

    return () => window.clearInterval(id);
  }, [enabled, idleSeconds, warnSeconds, heartbeatMs, forceLogout]);

  function handleStayConnected() {
    registerActivity();
    lastHeartbeatRef.current = Date.now();
    setRemaining(null);
    void fetch("/api/session/heartbeat", { method: "POST", cache: "no-store" }).then((res) => {
      if (res.status === 401) void forceLogout();
    });
  }

  if (!enabled || remaining === null) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="session-timeout-title"
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        zIndex: "var(--z-modal)",
        background: "rgba(11, 15, 22, 0.55)",
        backdropFilter: "blur(2px)",
        animation: "fade-in var(--dur-fast) var(--ease-out)",
      }}
    >
      <div
        className="w-full max-w-sm card card-lg p-5 space-y-4"
        style={{
          boxShadow: "var(--shadow-xl)",
          animation: "pop-in var(--dur-base) var(--ease-out)",
        }}
      >
        <div>
          <h2 id="session-timeout-title" className="card-title">
            Sua sessão vai expirar
          </h2>
          <p
            className="text-[var(--color-text-muted)] mt-1"
            style={{ fontSize: "var(--text-sm)" }}
          >
            Detectamos inatividade. Por segurança, você será desconectado em{" "}
            <strong className="text-[var(--color-text-heading)] mono">
              {remaining}s
            </strong>
            .
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleStayConnected}
            className="btn btn-primary flex-1"
          >
            Continuar conectado
          </button>
          <button
            type="button"
            onClick={() => void forceLogout()}
            className="btn btn-secondary"
          >
            Sair agora
          </button>
        </div>
      </div>
    </div>
  );
}

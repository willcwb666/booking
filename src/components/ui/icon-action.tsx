"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRightLeft,
  Ban,
  Bell,
  CheckCircle2,
  Copy,
  Edit2,
  ExternalLink,
  Eye,
  FileText,
  Key,
  Lock,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Settings,
  ShieldCheck,
  Trash2,
} from "@/components/ui/icons";

/**
 * Ação em ícone — o padrão único de ação de linha da aplicação.
 *
 * O ponto de ter um vocabulário fechado em vez de um `<button>` solto por
 * tela: hoje o mesmo "excluir" aparece em três desenhos diferentes conforme a
 * tela (contornado, com fundo cheio, só ícone), e "ativar empresa" era um
 * emoji `✅`. Quem administra a plataforma faz a mesma ação em telas
 * diferentes e precisa reconhecer o ícone sem ler.
 *
 * Cada `intent` amarra ÍCONE + TOM DE HOVER + rótulo padrão. Para escapar do
 * vocabulário é preciso passar `icon` e `label` explicitamente, o que torna a
 * exceção visível na revisão de código.
 */
export type ActionIntent =
  | "edit"
  | "delete"
  | "view"
  | "open"
  | "details"
  | "block"
  | "unblock"
  | "activate"
  | "deactivate"
  | "grant"
  | "revoke"
  | "reset"
  | "promote"
  | "duplicate"
  | "notify"
  | "settings"
  | "run"
  | "refresh"
  | "transfer"
  | "add"
  | "document";

type Tone = "neutral" | "primary" | "danger" | "success" | "warning";

const INTENTS: Record<
  ActionIntent,
  { icon: React.ReactNode; tone: Tone; label: string }
> = {
  edit: { icon: <Edit2 />, tone: "primary", label: "Editar" },
  delete: { icon: <Trash2 />, tone: "danger", label: "Excluir" },
  view: { icon: <Eye />, tone: "primary", label: "Ver detalhes" },
  details: { icon: <Eye />, tone: "primary", label: "Detalhes" },
  open: { icon: <ExternalLink />, tone: "primary", label: "Abrir" },
  block: { icon: <Ban />, tone: "danger", label: "Bloquear" },
  unblock: { icon: <CheckCircle2 />, tone: "success", label: "Desbloquear" },
  activate: { icon: <CheckCircle2 />, tone: "success", label: "Ativar" },
  deactivate: { icon: <Ban />, tone: "warning", label: "Desativar" },
  grant: { icon: <Key />, tone: "success", label: "Liberar" },
  revoke: { icon: <Lock />, tone: "danger", label: "Revogar" },
  reset: { icon: <RotateCcw />, tone: "warning", label: "Restaurar padrão" },
  promote: { icon: <ShieldCheck />, tone: "primary", label: "Permissões" },
  duplicate: { icon: <Copy />, tone: "primary", label: "Duplicar" },
  notify: { icon: <Bell />, tone: "primary", label: "Notificar" },
  settings: { icon: <Settings />, tone: "primary", label: "Configurar" },
  run: { icon: <Play />, tone: "success", label: "Executar" },
  refresh: { icon: <RefreshCw />, tone: "primary", label: "Atualizar" },
  transfer: { icon: <ArrowRightLeft />, tone: "primary", label: "Transferir" },
  add: { icon: <Plus />, tone: "primary", label: "Adicionar" },
  document: { icon: <FileText />, tone: "primary", label: "Documento" },
};

const TONE_CLASS: Record<Tone, string> = {
  neutral: "",
  primary: "icon-action-primary",
  danger: "icon-action-danger",
  success: "icon-action-success",
  warning: "icon-action-warning",
};

type BaseProps = {
  intent: ActionIntent;
  /**
   * Sobrescreve o rótulo padrão. Vira `aria-label` e `title` — o ícone sozinho
   * não é acessível, e "Excluir" genérico não diz *o quê*.
   */
  label?: string;
  /** Sobrescreve o ícone do vocabulário. Use com parcimônia. */
  icon?: React.ReactNode;
  /** Estado ligado de uma ação que alterna (ex.: usuário já é super admin). */
  pressed?: boolean;
  className?: string;
};

type ButtonProps = BaseProps & {
  onClick: () => void;
  href?: never;
  disabled?: boolean;
  /** Em andamento: desabilita e reduz opacidade, sem trocar o ícone. */
  pending?: boolean;
};

type LinkProps = BaseProps & {
  href: string;
  onClick?: never;
  /** Abre em nova aba com `rel` seguro. */
  external?: boolean;
};

export function IconAction(props: ButtonProps | LinkProps) {
  const { intent, label, icon, pressed, className = "" } = props;
  const spec = INTENTS[intent];
  const text = label ?? spec.label;

  const classes = [
    "icon-action",
    TONE_CLASS[spec.tone],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  // Tamanho vem daqui, não de cada chamada — foi assim que a aplicação acabou
  // com ícones de 3.5 e de 4 lado a lado na mesma linha.
  const glyph = (
    <span className="w-3.5 h-3.5 [&>svg]:w-full [&>svg]:h-full" aria-hidden="true">
      {icon ?? spec.icon}
    </span>
  );

  if ("href" in props && props.href) {
    return (
      <Link
        href={props.href}
        className={classes}
        aria-label={text}
        title={text}
        {...(props.external
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
      >
        {glyph}
      </Link>
    );
  }

  const { onClick, disabled, pending } = props as ButtonProps;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      aria-label={text}
      title={text}
      {...(pressed !== undefined ? { "aria-pressed": pressed } : {})}
      className={classes}
    >
      {glyph}
    </button>
  );
}

/** Agrupa as ações à direita da linha. */
export function RowActions({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`row-actions ${className}`}>{children}</div>;
}

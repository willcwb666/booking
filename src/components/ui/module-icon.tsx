"use client";

import React from "react";
import {
  Tag,
  Award,
  UserCheck,
  CreditCard,
  Gift,
  ClipboardList,
  Bell,
  Sparkles,
  DollarSign,
  Zap,
  MapPin,
  Star,
  RotateCcw,
  FileText,
  Layers,
  ShieldCheck,
  Percent,
  Clock,
  Coins,
  Bot,
  Users,
} from "@/components/ui/icons";

export const MODULE_ICON_MAP: Record<
  string,
  React.ComponentType<React.SVGProps<SVGSVGElement>>
> = {
  Tag,
  Award,
  UserCheck,
  CreditCard,
  Gift,
  ClipboardList,
  Bell,
  Sparkles,
  DollarSign,
  Zap,
  MapPin,
  Star,
  RotateCcw,
  FileText,
  Layers,
  ShieldCheck,
  Percent,
  Clock,
  Coins,
  Bot,
  Users,
};

type Props = {
  name: string;
  className?: string;
};

export function ModuleIcon({ name, className = "w-5 h-5" }: Props) {
  const IconComponent = MODULE_ICON_MAP[name] || Layers;
  return <IconComponent className={className} />;
}

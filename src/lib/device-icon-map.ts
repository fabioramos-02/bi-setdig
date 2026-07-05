import { Monitor, Smartphone, HelpCircle, type LucideIcon } from "lucide-react";

export function iconeDoDispositivo(nome: string): LucideIcon {
  if (nome === "Desktop") return Monitor;
  if (nome === "Smartphone") return Smartphone;
  return HelpCircle; // "Outros" — tablet/bot/desconhecido, já agrupado no transform
}

const CORES: Record<string, string> = {
  Desktop: "--ds-color-primary-600",
  Smartphone: "--ds-color-secondary-600",
  Outros: "--ds-color-neutral-500",
};

export function corDoDispositivo(nome: string): string {
  return `var(${CORES[nome] ?? "--ds-color-neutral-500"})`;
}

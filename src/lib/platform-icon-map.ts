import { Smartphone, Apple, HelpCircle, type LucideIcon } from "lucide-react";

export function iconeDaPlataforma(nome: string): LucideIcon {
  if (nome === "Android") return Smartphone;
  if (nome === "iOS") return Apple;
  return HelpCircle;
}

const CORES: Record<string, string> = {
  Android: "--ds-color-green-600",
  iOS: "--ds-color-blue-600",
};

export function corDaPlataforma(nome: string): string {
  return `var(${CORES[nome] ?? "--ds-color-neutral-500"})`;
}

import {
  Wheat, Milk, MilkOff, Egg, Fish, Shell, Nut, Bean, Sprout, Leaf,
  CandyOff, Flame, Wine, CircleAlert, type LucideIcon,
} from "lucide-react";

const ICONES: Record<string, LucideIcon> = {
  Wheat, Milk, MilkOff, Egg, Fish, Shell, Nut, Bean, Sprout, Leaf,
  CandyOff, Flame, Wine, CircleAlert,
};

export function TagIcon({ nome, className = "" }: { nome: string; className?: string }) {
  const Icone = ICONES[nome] ?? CircleAlert;
  return <Icone className={className} strokeWidth={1.75} aria-hidden />;
}

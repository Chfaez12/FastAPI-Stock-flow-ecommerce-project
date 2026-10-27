import {
  Apple,
  BookOpen,
  Car,
  Cpu,
  Dumbbell,
  Gamepad2,
  Gem,
  Home,
  type LucideIcon,
  Package,
  PawPrint,
  Pill,
  Shirt,
  Smartphone,
  Sparkles,
  Wrench,
} from 'lucide-react';

/** Products have no images, so each one is represented by an icon picked from its category name. */
const RULES: [RegExp, LucideIcon][] = [
  [/phone|mobile|tablet/i, Smartphone],
  [/electr|tech|computer|laptop|gadget|device/i, Cpu],
  [/cloth|apparel|fashion|wear|shirt|shoe/i, Shirt],
  [/book|station|office/i, BookOpen],
  [/food|grocery|drink|beverage|snack/i, Apple],
  [/home|kitchen|furnit|decor|garden/i, Home],
  [/sport|fitness|gym|outdoor/i, Dumbbell],
  [/beauty|cosmetic|care|skin/i, Sparkles],
  [/toy|game|kid/i, Gamepad2],
  [/jewel|watch|accessor/i, Gem],
  [/health|pharma|medic/i, Pill],
  [/auto|car|vehicle/i, Car],
  [/pet|animal/i, PawPrint],
  [/tool|hardware|diy/i, Wrench],
];

export function categoryIcon(categoryName?: string | null): LucideIcon {
  if (!categoryName) return Package;
  return RULES.find(([re]) => re.test(categoryName))?.[1] ?? Package;
}

/** A stable accent hue per category, so items from the same category share a color. */
const HUES = [243, 199, 160, 32, 330, 270, 12, 186];
export function categoryHue(seed: string | null | undefined): number {
  const s = seed ?? 'none';
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) | 0;
  return HUES[Math.abs(hash) % HUES.length]!;
}

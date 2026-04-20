import {
  CircleHelp,
  Layers3,
  Ruler,
  SearchCheck,
} from "lucide-react";

export const navigationItems = [
  {
    id: "search",
    label: "Search Land Record",
    description: "Khasra, owner and village search",
    icon: SearchCheck,
  },
  {
    id: "layers",
    label: "Map Layers",
    description: "Overlay and legend control",
    icon: Layers3,
  },
  {
    id: "measurement",
    label: "Measurement Tools",
    description: "Distance and area workflow",
    icon: Ruler,
  },
  {
    id: "help",
    label: "Help / FAQ",
    description: "Guides and support links",
    icon: CircleHelp,
  },
];

export const languageOptions = ["English", "हिंदी"];

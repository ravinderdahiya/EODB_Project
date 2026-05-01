import {
  CircleHelp,
  FileDown,
  Layers3,
  Ruler,
  SearchCheck,
  SlidersHorizontal,
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
    id: "download-terminology",
    label: "Cadastral Terminology",
    description: "View reference glossary PDF",
    icon: FileDown,
    pdfUrl: `${import.meta.env.BASE_URL}Cadastral-terminology.pdf`,
  },
  {
    id: "personalizations",
    label: "Personalizations",
    description: "Theme, display and visual settings",
    icon: SlidersHorizontal,
    type: "selector",
  },
  {
    id: "help",
    label: "Help / FAQ",
    description: "Guides and support links",
    icon: CircleHelp,
    pdfUrl: `${import.meta.env.BASE_URL}Help-FAQ.pdf`,
  },
];

export const languageOptions = ["English", "हिंदी"];

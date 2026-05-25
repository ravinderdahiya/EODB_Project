import {
  CircleHelp,
  FileDown,
  LocateFixed,
  MessageCircle,
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
    id: "find-latlong",
    label: "Find Lat/Long",
    description: "Find map location by coordinates",
    icon: LocateFixed,
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
  {
    id: "feedback",
    label: "Feedback",
    description: "Share suggestions or report issues",
    icon: MessageCircle,
  },
];

export const languageOptions = ["English", "हिंदी"];

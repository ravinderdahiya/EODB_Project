import {
  Bell,
  BookOpenText,
  CircleHelp,
  Layers3,
  Ruler,
  SearchCheck,
  ShieldCheck,
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

export const utilityActions = [
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "manuals", label: "Manuals", icon: BookOpenText },
];

export const languageOptions = ["English", "हिंदी"];

export const legendItems = [
  { id: "agri", label: "Agricultural", color: "#3a9d5d" },
  { id: "res", label: "Residential", color: "#f1b047" },
  { id: "water", label: "Water Body", color: "#41a4e9" },
  { id: "road", label: "Road", color: "#98a2af" },
];

export const statsCards = [
  {
    id: "secure",
    title: "100% Secure",
    value: "Trusted access",
    note: "Role-ready authentication shell",
    accent: "blue",
  },
  {
    id: "tehsils",
    title: "144 Tehsils",
    value: "Real-time updates",
    note: "Administrative coverage aligned to workflow",
    accent: "green",
  },
  {
    id: "villages",
    title: "6,812 Villages",
    value: "Connected hierarchy",
    note: "District, tehsil and village drill-down ready",
    accent: "mint",
  },
  {
    id: "parcels",
    title: "3.2 Cr+ Parcels",
    value: "Selection-ready map canvas",
    note: "Prepared for parcel lookup and highlight",
    accent: "orange",
  },
];

export const mockParcels = [
  {
    id: "kaithal-guha-1070",
    district: "Kaithal",
    tehsil: "Guha",
    village: "Bhagal",
    breadcrumb: "Kaithal District > Guha Tehsil > Village Bhagal",
    murabbaNo: "38",
    khasraNo: "1070",
    ownerName: "Ramesh Singh",
    area: "2.5 Acres",
    landUse: "Agricultural",
    verificationStatus: "Verified",
    recordType: "Jamabandi",
    jamabandiYear: "2025-26",
    mutationStatus: "Synced",
    registryRef: "DLR-KTL-GUH-1070",
    lastUpdated: "11 April 2026",
    overview:
      "Primary agricultural holding with clear parcel edge visibility and ready cadastral overlay support.",
    geometry: [
      [76.3569, 29.8022],
      [76.3591, 29.8022],
      [76.3593, 29.8041],
      [76.3571, 29.8042],
      [76.3569, 29.8022],
    ],
  },
  {
    id: "kaithal-guha-1091",
    district: "Kaithal",
    tehsil: "Guha",
    village: "Balbehra",
    breadcrumb: "Kaithal District > Guha Tehsil > Village Balbehra",
    murabbaNo: "41",
    khasraNo: "1091",
    ownerName: "Sunita Devi",
    area: "1.8 Acres",
    landUse: "Residential",
    verificationStatus: "Verified",
    recordType: "Mutation",
    jamabandiYear: "2025-26",
    mutationStatus: "Pending field check",
    registryRef: "DLR-KTL-GUH-1091",
    lastUpdated: "08 April 2026",
    overview:
      "Residential parcel prepared for ownership, mutation and utility-link workflows in the redesigned panel.",
    geometry: [
      [76.3478, 29.7957],
      [76.3492, 29.7958],
      [76.3494, 29.7972],
      [76.3481, 29.7973],
      [76.3478, 29.7957],
    ],
  },
  {
    id: "karnal-assandh-2104",
    district: "Karnal",
    tehsil: "Assandh",
    village: "Salwan",
    breadcrumb: "Karnal District > Assandh Tehsil > Village Salwan",
    murabbaNo: "63",
    khasraNo: "2104",
    ownerName: "Mahavir Malik",
    area: "4.1 Acres",
    landUse: "Agricultural",
    verificationStatus: "Field Review",
    recordType: "Jamabandi",
    jamabandiYear: "2025-26",
    mutationStatus: "Awaiting approval",
    registryRef: "DLR-KNL-ASD-2104",
    lastUpdated: "04 April 2026",
    overview:
      "Large holding used to demonstrate cross-district navigation and parcel-level contextual filters.",
    geometry: [
      [76.6108, 29.5124],
      [76.6142, 29.5124],
      [76.6145, 29.5154],
      [76.6112, 29.5156],
      [76.6108, 29.5124],
    ],
  },
  {
    id: "hisar-hansi-882",
    district: "Hisar",
    tehsil: "Hansi",
    village: "Kheri Barkhi",
    breadcrumb: "Hisar District > Hansi Tehsil > Village Kheri Barkhi",
    murabbaNo: "21",
    khasraNo: "882",
    ownerName: "Pooja Rani",
    area: "3.0 Acres",
    landUse: "Water Body",
    verificationStatus: "Verified",
    recordType: "Revenue Record",
    jamabandiYear: "2025-26",
    mutationStatus: "Synced",
    registryRef: "DLR-HSR-HNS-0882",
    lastUpdated: "10 April 2026",
    overview:
      "Water-edge parcel prepared to validate legend styling, land-use chips and layer contrast.",
    geometry: [
      [75.9561, 29.0498],
      [75.9589, 29.0498],
      [75.9592, 29.0521],
      [75.9565, 29.0523],
      [75.9561, 29.0498],
    ],
  },
];

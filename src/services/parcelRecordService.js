import { getBoundaryGeometry } from "@/services/mapQueryService";
import { getJamabandiPeriod, getOwnerNames } from "@/services/landRecordService";

const EMPTY_VALUE = "--";
const AREA_DEFAULT = "--";

/**
 * Build an Area(K-M) string from raw N_KANAL / N_MARLA attribute values.
 * Returns null when both values are absent so callers can apply their own fallback.
 */
function buildArea(kanal, marla) {
  const k = kanal != null && `${kanal}`.trim() !== "" ? `${kanal}`.trim() : null;
  const m = marla != null && `${marla}`.trim() !== "" ? `${marla}`.trim() : null;
  if (k === null && m === null) return null;
  return `${k ?? "0"}-${m ?? "0"}`;
}

function pickFirst(...values) {
  return values.find((value) => value !== undefined && value !== null && `${value}`.trim() !== "");
}

function toDisplayValue(value, fallback = EMPTY_VALUE) {
  const resolved = pickFirst(value);
  return resolved === undefined ? fallback : `${resolved}`.trim() || fallback;
}

function buildRegistryRef({ districtCode, tehsilCode, villageCode, murabbaNo, khasraNo, khewatNo, khatoniNo }) {
  const parts = [
    districtCode,
    tehsilCode,
    villageCode,
    murabbaNo,
    khasraNo,
    khewatNo,
    khatoniNo,
  ].filter(Boolean);

  return parts.length ? `DLR-${parts.join("-")}` : "DLR-UNAVAILABLE";
}

function buildBreadcrumb({ district, tehsil, village }) {
  const segments = [district, tehsil, village]
    .filter((value) => value && value !== EMPTY_VALUE)
    .map((value, index) => {
      if (index === 0) return `${value} District`;
      if (index === 1) return `${value} Tehsil`;
      return `Village ${value}`;
    });

  return segments.length ? segments.join(" > ") : "Haryana land record selection";
}

function getRecordType(sectionId) {
  if (sectionId === "jamabandi") return "Jamabandi";
  if (sectionId === "khewat") return "Khewat";
  return "Khasra";
}

export function createEmptyParcelRecord() {
  return {
    district: EMPTY_VALUE,
    districtCode: "",
    tehsil: EMPTY_VALUE,
    tehsilCode: "",
    village: EMPTY_VALUE,
    villageCode: "",
    murabbaNo: EMPTY_VALUE,
    khasraNo: EMPTY_VALUE,
    ownerName: EMPTY_VALUE,
    khewatNo: EMPTY_VALUE,
    khatoniNo: EMPTY_VALUE,
    jamabandiYear: EMPTY_VALUE,
    area: AREA_DEFAULT,
    landUse: EMPTY_VALUE,
    verificationStatus: "Service linked",
    recordType: EMPTY_VALUE,
    mutationStatus: EMPTY_VALUE,
    registryRef: "DLR-UNAVAILABLE",
    lastUpdated: "Live service response",
    overview: "Select a parcel from the search drawer or click a cadastral feature on the map.",
    breadcrumb: "Search Haryana land records",
    geometry: null,
  };
}

export async function createParcelRecordFromSelection({ sectionId, codes = {}, names = {} }) {
  const districtCode = toDisplayValue(codes.district, "");
  const tehsilCode = toDisplayValue(codes.tehsil, "");
  const villageCode = toDisplayValue(codes.village, "");
  const murabbaNo = toDisplayValue(codes.murabba);
  const khasraNo = toDisplayValue(codes.khasra);
  const khewatNo = toDisplayValue(codes.khewat);
  const khatoniNo = toDisplayValue(codes.khatoni);
  const district = toDisplayValue(names.district);
  const tehsil = toDisplayValue(names.tehsil);
  const village = toDisplayValue(names.village);

  const [jamabandiYear, owners, boundary] = await Promise.all([
    districtCode && tehsilCode && villageCode
      ? getJamabandiPeriod(districtCode, tehsilCode, villageCode).catch(() => "")
      : Promise.resolve(""),
    sectionId === "khasra" && districtCode && tehsilCode && villageCode && codes.murabba && codes.khasra
      ? getOwnerNames(districtCode, tehsilCode, villageCode, codes.murabba, codes.khasra).catch(() => [])
      : Promise.resolve([]),
    districtCode
      ? getBoundaryGeometry(
          sectionId === "khasra" ? "khasra" : "village",
          {
            dCode: districtCode,
            tCode: tehsilCode,
            vCode: villageCode,
            murabbaNo: codes.murabba,
            khasraNo: codes.khasra,
          },
        ).catch(() => ({ features: [] }))
      : Promise.resolve({ features: [] }),
  ]);

  const geometry = boundary.features?.[0]?.geometry ?? null;
  const boundaryAttrs = boundary.features?.[0]?.attributes ?? {};
  const area = buildArea(
    boundaryAttrs.N_KANAL ?? boundaryAttrs.n_kanal,
    boundaryAttrs.N_MARLA ?? boundaryAttrs.n_marla,
  ) ?? AREA_DEFAULT;
  const ownerName = owners.length ? owners.join(", ") : EMPTY_VALUE;
  const recordType = getRecordType(sectionId);
  const registryRef = buildRegistryRef({
    districtCode,
    tehsilCode,
    villageCode,
    murabbaNo: codes.murabba,
    khasraNo: codes.khasra,
    khewatNo: codes.khewat,
    khatoniNo: codes.khatoni,
  });

  return {
    district,
    districtCode,
    tehsil,
    tehsilCode,
    village,
    villageCode,
    murabbaNo,
    khasraNo,
    ownerName,
    khewatNo,
    khatoniNo,
    jamabandiYear: toDisplayValue(jamabandiYear),
    area,
    landUse: EMPTY_VALUE,
    verificationStatus: owners.length ? "Service linked" : "Pending owner data",
    recordType,
    mutationStatus: EMPTY_VALUE,
    registryRef,
    lastUpdated: "Live HSAC service",
    overview:
      sectionId === "khasra"
        ? "Parcel selected from the live cadastral hierarchy. Owner names are resolved from the HSAC land-record service."
        : "Village-level land-record selection resolved from the live HSAC hierarchy and linked revenue services.",
    breadcrumb: buildBreadcrumb({ district, tehsil, village }),
    geometry,
  };
}

export async function createParcelRecordFromMapFeature({
  attributes = {},
  geometry = null,
  fallbackParcel,
}) {
  const districtCode = toDisplayValue(attributes.n_d_code, fallbackParcel?.districtCode ?? "");
  const tehsilCode = toDisplayValue(attributes.n_t_code, fallbackParcel?.tehsilCode ?? "");
  const villageCode = toDisplayValue(attributes.n_v_code, fallbackParcel?.villageCode ?? "");
  const murabbaNo = toDisplayValue(attributes.n_murr_no, fallbackParcel?.murabbaNo);
  const khasraNo = toDisplayValue(attributes.n_khas_no, fallbackParcel?.khasraNo);
  const district = toDisplayValue(attributes.n_d_name, fallbackParcel?.district);
  const tehsil = toDisplayValue(attributes.n_t_name, fallbackParcel?.tehsil);
  const village = toDisplayValue(attributes.n_v_name, fallbackParcel?.village);

  const [owners, jamabandiYear] = await Promise.all([
    districtCode && tehsilCode && villageCode && attributes.n_murr_no && attributes.n_khas_no
      ? getOwnerNames(districtCode, tehsilCode, villageCode, attributes.n_murr_no, attributes.n_khas_no).catch(() => [])
      : Promise.resolve([]),
    districtCode && tehsilCode && villageCode
      ? getJamabandiPeriod(districtCode, tehsilCode, villageCode).catch(() => "")
      : Promise.resolve(""),
  ]);

  const ownerName = owners.length
    ? owners.join(", ")
    : toDisplayValue(fallbackParcel?.ownerName);

  const area =
    buildArea(attributes.N_KANAL ?? attributes.n_kanal, attributes.N_MARLA ?? attributes.n_marla) ??
    buildArea(fallbackParcel?.N_KANAL ?? fallbackParcel?.n_kanal, fallbackParcel?.N_MARLA ?? fallbackParcel?.n_marla) ??
    (fallbackParcel?.area && fallbackParcel.area !== EMPTY_VALUE ? fallbackParcel.area : null) ??
    AREA_DEFAULT;

  return {
    district,
    districtCode,
    tehsil,
    tehsilCode,
    village,
    villageCode,
    murabbaNo,
    khasraNo,
    ownerName,
    khewatNo: toDisplayValue(fallbackParcel?.khewatNo),
    khatoniNo: toDisplayValue(fallbackParcel?.khatoniNo),
    jamabandiYear: toDisplayValue(jamabandiYear, fallbackParcel?.jamabandiYear ?? EMPTY_VALUE),
    area,
    landUse: toDisplayValue(fallbackParcel?.landUse),
    verificationStatus: owners.length ? "Service linked" : toDisplayValue(fallbackParcel?.verificationStatus, "Pending owner data"),
    recordType: toDisplayValue(fallbackParcel?.recordType, "Khasra"),
    mutationStatus: toDisplayValue(fallbackParcel?.mutationStatus),
    registryRef: buildRegistryRef({
      districtCode,
      tehsilCode,
      villageCode,
      murabbaNo: attributes.n_murr_no,
      khasraNo: attributes.n_khas_no,
    }),
    lastUpdated: "Live HSAC service",
    overview:
      "Parcel preview resolved from the live cadastral map click. Supporting revenue fields remain service-dependent.",
    breadcrumb: buildBreadcrumb({ district, tehsil, village }),
    geometry,
  };
}

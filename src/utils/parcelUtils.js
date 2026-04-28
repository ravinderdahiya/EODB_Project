/**
 * parcelUtils.js
 *
 * Shared utilities for parcel data display and normalization.
 */

const PARCEL_FIELD_DEFAULTS = {
  district:           "--",
  tehsil:             "--",
  village:            "--",
  murabbaNo:          "--",
  khasraNo:           "--",
  ownerName:          "--",
  khewatNo:           "--",
  khatoniNo:          "--",
  jamabandiYear:      "--",
  area:               "--",
  recordType:         "--",
  verificationStatus: "--",
  mutationStatus:     "--",
  registryRef:        "--",
  lastUpdated:        "--",
};

/**
 * Return a copy of the parcel object with missing/falsy fields replaced by
 * their display defaults (e.g. "--" or "7-0" for area).
 *
 * @param {object|null|undefined} parcel  Raw parcel record
 * @param {Partial<typeof PARCEL_FIELD_DEFAULTS>} [overrides]  Custom defaults
 * @returns {object}  Normalized parcel safe for direct JSX rendering
 */
export function normalizeParcel(parcel, overrides = {}) {
  const defaults = { ...PARCEL_FIELD_DEFAULTS, ...overrides };
  const src = parcel ?? {};
  const result = { ...src };
  for (const [key, fallback] of Object.entries(defaults)) {
    if (!result[key]) result[key] = fallback;
  }
  return result;
}

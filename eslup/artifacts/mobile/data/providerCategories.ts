// ─── Canonical provider-type & specialty data ──────────────────────────────
// Single source of truth for the provider types and specialties a real
// provider chooses at registration (see app/(provider)/register.tsx). The
// Explore → Service → Specialist-list flow reuses these exact values so a
// user never sees a category or specialty that doesn't actually exist in the
// live Supabase `doctors` table.

export type ProviderType = "doctor" | "nurse" | "homecare" | "physiotherapist" | "institution";

export const PROVIDER_TYPES: { id: ProviderType; label: string; icon: string; desc: string }[] = [
  { id: "doctor", label: "Doctor", icon: "user", desc: "Licensed medical practitioner" },
  { id: "nurse", label: "Nurse", icon: "heart", desc: "Registered nursing professional" },
  { id: "homecare", label: "Home Care Provider", icon: "home", desc: "In-home care specialist" },
  { id: "physiotherapist", label: "Physiotherapist", icon: "zap", desc: "Rehabilitation & physical therapy" },
  { id: "institution", label: "Health Institution", icon: "activity", desc: "Hospital, clinic, or facility" },
];

export const SPECIALTIES_BY_TYPE: Record<ProviderType, string[]> = {
  doctor: ["General Practitioner", "Cardiologist", "Neurologist", "Pediatrician", "OB-GYN", "Orthopedic Surgeon", "Psychiatrist", "Gastroenterologist", "Oncologist", "Dermatologist"],
  nurse: ["Registered Nurse", "Nurse Practitioner", "Clinical Nurse Specialist", "Emergency Nurse", "Pediatric Nurse"],
  homecare: ["Skilled Nursing Care", "Personal Care", "Elderly Care", "Post-Surgery Care", "Palliative Care"],
  physiotherapist: ["Sports Therapy", "Orthopedic Rehab", "Neurological Rehab", "Cardiac Rehab", "Pediatric PT"],
  institution: ["General Hospital", "Specialty Clinic", "Diagnostic Center", "Emergency Room", "Maternity Center"],
};

// ─── Explore/Service screen category ids ───────────────────────────────────
// The Explore tab and Service screen use these plural/legacy ids in their
// navigation params (and translation keys). Map them to the real
// `providerType` values stored on the `doctors` table.
export type ServiceCategoryId = "doctors" | "nurses" | "homecare" | "physiotherapy" | "health_institutions";

export const CATEGORY_TO_PROVIDER_TYPE: Record<ServiceCategoryId, ProviderType> = {
  doctors: "doctor",
  nurses: "nurse",
  homecare: "homecare",
  physiotherapy: "physiotherapist",
  health_institutions: "institution",
};

export const SPECIALTIES_BY_CATEGORY: Record<ServiceCategoryId, string[]> = {
  doctors: SPECIALTIES_BY_TYPE.doctor,
  nurses: SPECIALTIES_BY_TYPE.nurse,
  homecare: SPECIALTIES_BY_TYPE.homecare,
  physiotherapy: SPECIALTIES_BY_TYPE.physiotherapist,
  health_institutions: SPECIALTIES_BY_TYPE.institution,
};

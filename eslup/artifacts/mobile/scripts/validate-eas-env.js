const required = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  "EXPO_PUBLIC_DOMAIN",
];

const missing = required.filter((key) => !process.env[key]?.trim());

if (missing.length > 0) {
  console.error(
    `Missing required Expo production environment variables: ${missing.join(", ")}`,
  );
  console.error(
    "Configure them for the production environment in the Expo project before building.",
  );
  process.exit(1);
}

try {
  const supabaseUrl = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL);
  if (supabaseUrl.protocol !== "https:") {
    throw new Error("Supabase URL must use HTTPS");
  }
} catch {
  console.error("EXPO_PUBLIC_SUPABASE_URL must be a valid HTTPS URL.");
  process.exit(1);
}

if (/^https?:\/\//i.test(process.env.EXPO_PUBLIC_DOMAIN)) {
  console.error(
    "EXPO_PUBLIC_DOMAIN must be a hostname without an http:// or https:// prefix.",
  );
  process.exit(1);
}

console.log("Expo production environment is configured.");
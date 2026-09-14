import { useApp, Language } from "@/context/AppContext";
import { useTranslation } from "@/constants/translations";

export interface LanguageInfo {
  id: Language;
  label: string;
  native: string;
  flag: string;
}

export const AVAILABLE_LANGUAGES: LanguageInfo[] = [
  { id: "en", label: "English", native: "English", flag: "🇺🇸" },
  { id: "am", label: "Amharic", native: "አማርኛ", flag: "🇪🇹" },
  { id: "om", label: "Afaan Oromo", native: "Afaan Oromoo", flag: "🇪🇹" },
  { id: "ar", label: "Arabic", native: "العربية", flag: "🇸🇦" },
  { id: "so", label: "Somali", native: "Soomaali", flag: "🇸🇴" },
];

export function useLanguage() {
  const { language, setLanguage } = useApp();
  const t = useTranslation(language);
  const isRTL = language === "ar";

  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
  };

  const currentLanguageInfo =
    AVAILABLE_LANGUAGES.find((l) => l.id === language) ?? AVAILABLE_LANGUAGES[0];

  return {
    currentLanguage: language,
    currentLanguageInfo,
    changeLanguage,
    isRTL,
    availableLanguages: AVAILABLE_LANGUAGES,
    t,
  };
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getCurrentTwickLocale,
  getStoredTwickLanguagePreference,
  resolveTwickLocale,
  translateTwickText,
  TWICK_LANGUAGE_OPTIONS,
  TWICK_LANGUAGE_STORAGE_KEY,
  type TwickLanguagePreference,
  type TwickLocale,
  type TwickTranslationKey,
} from "./translations";

type TranslationParams = Record<string, string | number>;

export interface TwickI18nContextValue {
  language: TwickLocale;
  languagePreference: TwickLanguagePreference;
  setLanguagePreference: (language: TwickLanguagePreference) => void;
  availableLanguages: TwickLanguagePreference[];
  t: (key: TwickTranslationKey, params?: TranslationParams) => string;
}

const TwickI18nContext = createContext<TwickI18nContextValue | undefined>(
  undefined,
);

const createFallbackValue = (): TwickI18nContextValue => {
  const language = getCurrentTwickLocale();

  return {
    language,
    languagePreference: "auto",
    setLanguagePreference: () => {},
    availableLanguages: TWICK_LANGUAGE_OPTIONS,
    t: (key, params) => translateTwickText(language, key, params),
  };
};

export function TwickI18nProvider({
  children,
  storageKey = TWICK_LANGUAGE_STORAGE_KEY,
}: {
  children: ReactNode;
  storageKey?: string;
}) {
  const parentContext = useContext(TwickI18nContext);
  const [languagePreference, setLanguagePreferenceState] =
    useState<TwickLanguagePreference>(() =>
      getStoredTwickLanguagePreference(storageKey),
    );
  const [browserLanguage, setBrowserLanguage] = useState<string | null>(() =>
    typeof window === "undefined" ? "en" : window.navigator?.language ?? "en",
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setLanguagePreferenceState(getStoredTwickLanguagePreference(storageKey));
    setBrowserLanguage(window.navigator?.language ?? "en");
  }, [storageKey]);

  const setLanguagePreference = useCallback(
    (nextLanguage: TwickLanguagePreference) => {
      setLanguagePreferenceState(nextLanguage);

      if (typeof window === "undefined") {
        return;
      }

      if (nextLanguage === "auto") {
        window.localStorage.removeItem(storageKey);
        return;
      }

      window.localStorage.setItem(storageKey, nextLanguage);
    },
    [storageKey],
  );

  const language = useMemo(
    () => resolveTwickLocale(languagePreference, browserLanguage),
    [browserLanguage, languagePreference],
  );

  const t = useCallback(
    (key: TwickTranslationKey, params?: TranslationParams) =>
      translateTwickText(language, key, params),
    [language],
  );

  const value = useMemo(
    () => ({
      language,
      languagePreference,
      setLanguagePreference,
      availableLanguages: TWICK_LANGUAGE_OPTIONS,
      t,
    }),
    [language, languagePreference, setLanguagePreference, t],
  );

  if (parentContext) {
    return <>{children}</>;
  }

  return (
    <TwickI18nContext.Provider value={value}>
      {children}
    </TwickI18nContext.Provider>
  );
}

export function useTwickI18n(): TwickI18nContextValue {
  return useContext(TwickI18nContext) ?? createFallbackValue();
}

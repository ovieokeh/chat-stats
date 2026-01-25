import en from "../locales/new.json";
// import en from "../locales/en.json";

// Type-safe accessor? For now, we'll just use a simple key traversal.
// In a real app with i18n, we'd use a library like react-i18next or next-intl.

// Helper to get nested value by dot notation string
function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const value = path.split(".").reduce((acc: unknown, part) => {
    if (acc && typeof acc === "object" && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj);

  return typeof value === "string" ? value : undefined;
}

export const useText = () => {
  // In the future, this could use a context to get current locale
  const locale = en;

  const t = (key: string, params?: Record<string, string | number>): string => {
    let text = getNestedValue(locale, key) || key;

    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`{{${k}}}`, "g"), String(v));
      });
    }

    return text;
  };

  return { t, locale };
};

export const getText = (key: string, params?: Record<string, string | number>): string => {
  let text = getNestedValue(en, key) || key;

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(new RegExp(`{{${k}}}`, "g"), String(v));
    });
  }

  return text;
};

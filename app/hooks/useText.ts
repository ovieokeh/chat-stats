import en from "../locales/en.json";

// Type-safe accessor? For now, we'll just use a simple key traversal.
// In a real app with i18n, we'd use a library like react-i18next or next-intl.

type LocaleData = typeof en;

// Helper to get nested value by dot notation string
function getNestedValue(obj: any, path: string): string | undefined {
  return path.split(".").reduce((acc, part) => acc && acc[part], obj);
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

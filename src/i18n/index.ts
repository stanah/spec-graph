export type Locale = 'ja' | 'en';

type Messages = Record<string, string>;

const ja: Messages = {
  'errors.nonEmptyString': '空でない文字列である必要があります',
  'errors.uniqueNodeIds': 'ノードIDは一意である必要があります',
  'errors.invalid_type': '型が不正です',
  'errors.required': '必須項目が不足しています',
};

const en: Messages = {
  'errors.nonEmptyString': 'Must be a non-empty string',
  'errors.uniqueNodeIds': 'Node IDs must be unique',
  'errors.invalid_type': 'Invalid type',
  'errors.required': 'Required field is missing',
};

const catalogs: Record<Locale, Messages> = { ja, en };

export function t(key: string, locale: Locale = 'ja', fallback?: string): string {
  const cat = catalogs[locale] || catalogs.ja;
  return cat[key] || fallback || key;
}


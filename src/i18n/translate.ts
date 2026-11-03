import english from './en.json';
import type { Language } from '../domain/preferences';

const messages: Record<string, string> = english;
export type TranslationValues = Record<string, string | number>;

export function translate(message: string, language: Language, values: TranslationValues = {}): string {
  const template = language === 'en' && Object.hasOwn(messages, message) ? messages[message] : message;
  return template.replace(/\{(\w+)\}/g, (placeholder, key: string) => String(values[key] ?? placeholder));
}

const patterns = Object.keys(messages).filter(key => /\{\w+\}/.test(key)).map(key => {
  const names: string[] = [];
  const pattern = key.split(/(\{\w+\})/).map(part => {
    if (/^\{\w+\}$/.test(part)) { names.push(part.slice(1, -1)); return '(.+?)'; }
    return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('');
  return { key, names, expression: new RegExp(`^${pattern}$`) };
});

export function translateRuntimeMessage(message: string, language: Language): string {
  if (language !== 'en') return message;
  if (Object.hasOwn(messages, message)) return messages[message];
  for (const { key, names, expression } of patterns) {
    const match = expression.exec(message);
    if (match) return translate(key, language, Object.fromEntries(names.map((name, index) => [name, name === 'error' ? translateRuntimeMessage(match[index + 1], language) : match[index + 1]])));
  }
  return message;
}

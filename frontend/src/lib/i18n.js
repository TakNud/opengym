// Tiny dependency-free i18n. English source strings are the keys; locale files in
// src/locales/ map them to translations and are lazy-loaded (Vite code-splits each
// import.meta.glob entry), so the initial bundle stays English-only.
// Exercise instructions come from separately generated packs in src/instr/ (one per
// language, from the upstream dataset) — also lazy-loaded on language switch.
import { useSyncExternalStore } from 'react'

// UI languages. de/pt have no instruction pack upstream — instructions fall back to English.
// he's instruction and name packs are translated in-repo (src/instr/he.js, src/names/he.js).
export const LANGS = {
  en: 'English', de: 'Deutsch', es: 'Español', fr: 'Français', it: 'Italiano',
  pt: 'Português', pl: 'Polski', tr: 'Türkçe', ru: 'Русский', zh: '中文',
  ko: '한국어', hi: 'हिन्दी', he: 'עברית'
}
export const INSTR_LANGS = ['en', 'es', 'fr', 'it', 'tr', 'ru', 'zh', 'hi', 'pl', 'ko', 'he']
// Right-to-left UI languages: <html dir> flips and logical CSS properties follow.
export const RTL_LANGS = ['he']
// Language a fresh profile starts in. Set at build time (VITE_DEFAULT_LANG) so an
// instance can default to its own language; English otherwise.
export const DEFAULT_LANG = LANGS[import.meta.env.VITE_DEFAULT_LANG] ? import.meta.env.VITE_DEFAULT_LANG : 'en'
const DATE_LOCALES = {
  en: 'en-GB', de: 'de-DE', es: 'es-ES', fr: 'fr-FR', it: 'it-IT', pt: 'pt-PT',
  pl: 'pl-PL', tr: 'tr-TR', ru: 'ru-RU', zh: 'zh-CN', ko: 'ko-KR', hi: 'hi-IN', he: 'he-IL'
}

const localePacks = import.meta.glob('../locales/*.js')
const instrPacks = import.meta.glob('../instr/*.js')
const namePacks = import.meta.glob('../names/*.js')

let lang = 'en'
let dict = {}
let instr = null            // { exId: [steps] } for the current language, null = English
let names = null            // { exId: name } for the current language, null = English
let version = 0
const subs = new Set()
const notify = () => { version++; subs.forEach(f => f()) }

export const getLang = () => lang
export const isRTL = () => RTL_LANGS.includes(lang)
export const dateLocale = () => DATE_LOCALES[lang] || 'en-GB'

// Translate a source string; {0},{1}… are replaced with args (also on the English fallback).
export function t(s, ...args) {
  let v = dict[s] || s
  for (let i = 0; i < args.length; i++) v = v.replaceAll('{' + i + '}', args[i])
  return v
}
// Instructions for an exercise in the current language (English steps as fallback).
export const instrFor = ex => (instr && instr[ex.id]) || ex.st || []
// Exercise name in the current language (English as fallback). Only languages with a
// names pack in src/names/ translate them; everyone else sees the dataset's English.
export const nameFor = ex => (names && ex && names[ex.id]) || ex?.n || ''

export async function setLang(l) {
  if (!LANGS[l]) l = DEFAULT_LANG
  if (l === lang && version > 0) return
  lang = l
  // Each pack loads on its own: a missing content pack must not take the UI strings with it.
  const load = async (packs, dir) => {
    const f = l !== 'en' && packs['../' + dir + '/' + l + '.js']
    try { return f ? (await f()).default : null } catch (e) { return null }
  }
  dict = (await load(localePacks, 'locales')) || {}
  instr = INSTR_LANGS.includes(l) ? await load(instrPacks, 'instr') : null
  names = await load(namePacks, 'names')
  document.documentElement.lang = l
  document.documentElement.dir = isRTL() ? 'rtl' : 'ltr'
  notify()
}

// Re-renders the subscribing component (and its children) whenever the language changes.
export function useLang() {
  return useSyncExternalStore(fn => { subs.add(fn); return () => subs.delete(fn) }, () => version)
}

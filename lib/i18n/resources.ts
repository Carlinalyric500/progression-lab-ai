import arCommon from './translations/ar/common.json';
import arNav from './translations/ar/nav.json';
import arGenerator from './translations/ar/generator.json';
import deCommon from './translations/de/common.json';
import deNav from './translations/de/nav.json';
import deGenerator from './translations/de/generator.json';
import daDKCommon from './translations/da-DK/common.json';
import daDKNav from './translations/da-DK/nav.json';
import daDKGenerator from './translations/da-DK/generator.json';
import elCommon from './translations/el/common.json';
import elNav from './translations/el/nav.json';
import elGenerator from './translations/el/generator.json';
import enCommon from './translations/en/common.json';
import enNav from './translations/en/nav.json';
import enGenerator from './translations/en/generator.json';
import esCommon from './translations/es/common.json';
import esNav from './translations/es/nav.json';
import esGenerator from './translations/es/generator.json';
import frCommon from './translations/fr/common.json';
import frNav from './translations/fr/nav.json';
import frGenerator from './translations/fr/generator.json';
import fiFICommon from './translations/fi-FI/common.json';
import fiFINav from './translations/fi-FI/nav.json';
import fiFIGenerator from './translations/fi-FI/generator.json';
import heCommon from './translations/he/common.json';
import heNav from './translations/he/nav.json';
import heGenerator from './translations/he/generator.json';
import hiCommon from './translations/hi/common.json';
import hiNav from './translations/hi/nav.json';
import hiGenerator from './translations/hi/generator.json';
import isISCommon from './translations/is-IS/common.json';
import isISNav from './translations/is-IS/nav.json';
import isISGenerator from './translations/is-IS/generator.json';
import itCommon from './translations/it/common.json';
import itNav from './translations/it/nav.json';
import itGenerator from './translations/it/generator.json';
import jaCommon from './translations/ja/common.json';
import jaNav from './translations/ja/nav.json';
import jaGenerator from './translations/ja/generator.json';
import koCommon from './translations/ko/common.json';
import koNav from './translations/ko/nav.json';
import koGenerator from './translations/ko/generator.json';
import nlCommon from './translations/nl/common.json';
import nlNav from './translations/nl/nav.json';
import nlGenerator from './translations/nl/generator.json';
import nbNOCommon from './translations/nb-NO/common.json';
import nbNONav from './translations/nb-NO/nav.json';
import nbNOGenerator from './translations/nb-NO/generator.json';
import plCommon from './translations/pl/common.json';
import plNav from './translations/pl/nav.json';
import plGenerator from './translations/pl/generator.json';
import ptBRCommon from './translations/pt-BR/common.json';
import ptBRNav from './translations/pt-BR/nav.json';
import ptBRGenerator from './translations/pt-BR/generator.json';
import ptPTCommon from './translations/pt-PT/common.json';
import ptPTNav from './translations/pt-PT/nav.json';
import ptPTGenerator from './translations/pt-PT/generator.json';
import svSECommon from './translations/sv-SE/common.json';
import svSENav from './translations/sv-SE/nav.json';
import svSEGenerator from './translations/sv-SE/generator.json';
import trCommon from './translations/tr/common.json';
import trNav from './translations/tr/nav.json';
import trGenerator from './translations/tr/generator.json';
import zhCNCommon from './translations/zh-CN/common.json';
import zhCNNav from './translations/zh-CN/nav.json';
import zhCNGenerator from './translations/zh-CN/generator.json';
import zhTWCommon from './translations/zh-TW/common.json';
import zhTWNav from './translations/zh-TW/nav.json';
import zhTWGenerator from './translations/zh-TW/generator.json';

const composeTranslation = (
  common: Record<string, unknown>,
  nav: Record<string, unknown>,
  generator: Record<string, unknown>,
) => ({
  common,
  nav,
  generator,
});

export const translationResources = {
  en: composeTranslation(enCommon, enNav, enGenerator),
  'en-GB': composeTranslation(enCommon, enNav, enGenerator),
  es: composeTranslation(esCommon, esNav, esGenerator),
  'es-ES': composeTranslation(esCommon, esNav, esGenerator),
  'es-GQ': composeTranslation(esCommon, esNav, esGenerator),
  fr: composeTranslation(frCommon, frNav, frGenerator),
  el: composeTranslation(elCommon, elNav, elGenerator),
  de: composeTranslation(deCommon, deNav, deGenerator),
  'sv-SE': composeTranslation(svSECommon, svSENav, svSEGenerator),
  'da-DK': composeTranslation(daDKCommon, daDKNav, daDKGenerator),
  'nb-NO': composeTranslation(nbNOCommon, nbNONav, nbNOGenerator),
  'fi-FI': composeTranslation(fiFICommon, fiFINav, fiFIGenerator),
  'is-IS': composeTranslation(isISCommon, isISNav, isISGenerator),
  it: composeTranslation(itCommon, itNav, itGenerator),
  'pt-BR': composeTranslation(ptBRCommon, ptBRNav, ptBRGenerator),
  'pt-PT': composeTranslation(ptPTCommon, ptPTNav, ptPTGenerator),
  'pt-AO': composeTranslation(ptPTCommon, ptPTNav, ptPTGenerator),
  'pt-MZ': composeTranslation(ptPTCommon, ptPTNav, ptPTGenerator),
  nl: composeTranslation(nlCommon, nlNav, nlGenerator),
  pl: composeTranslation(plCommon, plNav, plGenerator),
  tr: composeTranslation(trCommon, trNav, trGenerator),
  ja: composeTranslation(jaCommon, jaNav, jaGenerator),
  ko: composeTranslation(koCommon, koNav, koGenerator),
  'zh-CN': composeTranslation(zhCNCommon, zhCNNav, zhCNGenerator),
  'zh-TW': composeTranslation(zhTWCommon, zhTWNav, zhTWGenerator),
  hi: composeTranslation(hiCommon, hiNav, hiGenerator),
  ar: composeTranslation(arCommon, arNav, arGenerator),
  'ar-EG': composeTranslation(arCommon, arNav, arGenerator),
  'ar-MA': composeTranslation(arCommon, arNav, arGenerator),
  he: composeTranslation(heCommon, heNav, heGenerator),
} as const;

/**
 * Plural-aware labels (enterprise UX study, first five #3). A label that carries a count takes one
 * of three shapes, so a language with more plural forms than English can say every count right:
 *
 * - a string, as before: one wording for every count ("{count} selected");
 * - the CLDR forms of the locale, `{ one, few, other }`, picked with `Intl.PluralRules(locale)`:
 *   Bosnian, Croatian and Serbian need `one` (1, 21, 31, 101), `few` (2–4, 22–24) and `other`
 *   (0, 5–20, 25–30, 100); English and German need `one` and `other`;
 * - a function of the count, for an app whose own i18n library already picks the form:
 *   `(n) => t('rows', { count: n })`.
 *
 * Whatever the shape gives is still a template: `{count}` and the label's other placeholders are
 * filled in after the form is chosen.
 *
 * No runtime i18n dependency: `Intl.PluralRules` is in every supported browser and in Node.
 */

/** The CLDR plural forms of one label. `other` is required: it is every language's fallback. */
export interface UixPluralForms {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

/** A label that carries a count: one string, the plural forms, or a function of the count. */
export type UixCountLabel = string | UixPluralForms | ((count: number) => string);

const rulesByLocale = new Map<string, Intl.PluralRules>();

function rulesFor(locale: string | undefined): Intl.PluralRules {
  const key = locale ?? '';
  let rules = rulesByLocale.get(key);
  if (!rules) {
    try {
      rules = new Intl.PluralRules(locale || 'en');
    } catch {
      // a malformed tag (RangeError) must not take the component down with it
      rules = new Intl.PluralRules('en');
    }
    rulesByLocale.set(key, rules);
  }
  return rules;
}

/**
 * The CLDR cardinal category of `count` in `locale` (default English), e.g.
 * `pluralCategory(22, 'bs')` → `'few'`. The `Intl.PluralRules` behind it is cached per locale.
 */
export function pluralCategory(count: number, locale?: string): Intl.LDMLPluralRule {
  return rulesFor(locale).select(count);
}

/**
 * The template of a count label for `count`. A string is returned as it is; plural forms give the
 * locale's category, then `other`; a function is called with the count.
 *
 * `one` is the legacy one-form of a `…One` / `…Many` pair: when `label` (the `…Many` key) is a plain
 * string and `one` is given, `count === 1` takes `one`, exactly as before plural forms existed. Put
 * the forms on the `…Many` key and the `…One` key is no longer read.
 */
export function countLabel(label: UixCountLabel, count: number, locale?: string, one?: string): string {
  if (typeof label === 'function') return label(count);
  if (typeof label === 'string') return one !== undefined && count === 1 ? one : label;
  return label[pluralCategory(count, locale)] ?? label.other;
}

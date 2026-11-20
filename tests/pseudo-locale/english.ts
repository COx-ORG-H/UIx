/* The English source the pseudo-locales are made from (tests/pseudo-locale/pseudo.mjs): the kit's
 * complete English pack, without `locale` (data, not words). This was a hand-kept copy of every
 * UixLabels namespace, which every PR that added labels had to edit too, so every two such PRs
 * conflicted. The pack is complete by type (UixLabelPack), so it is the source now; a PR adds its
 * labels to the packs only. */
import { en } from '../../packages/react/src/locales/en.js';

const { locale: _locale, ...words } = en;

export const ENGLISH = words;

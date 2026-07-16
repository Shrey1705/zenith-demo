// Evaluation rubric — the 9 categories every persona scores, each 1-5.
// Personas carry their own weights over these categories (must sum to 1.0);
// the anchors below go into the roleplay prompt so "3" means the same thing
// across personas and runs.
const CATEGORIES = {
  onboarding: 'How quickly a first-time user gets from landing to their first useful result. 1 = lost immediately, 5 = productive in minutes without help.',
  navigation: 'Finding things: menus, hierarchy, where documents live. 1 = constantly lost, 5 = always knows where to go next.',
  speed: 'Perceived responsiveness of the product and its AI. 1 = painfully slow, 5 = instant.',
  featureUsefulness: 'Do the features solve this persona\'s actual job-to-be-done? 1 = toys, 5 = would replace a current tool.',
  trust: 'Confidence in the answers, data handling and privacy story. 1 = would not paste real docs, 5 = would put confidential work in it.',
  clarity: 'Copy, labels and concepts make sense without a manual. 1 = jargon soup, 5 = self-explanatory.',
  perceivedIntelligence: 'Does the AI feel genuinely smart about MY product, or generic? 1 = boilerplate bot, 5 = feels like a sharp colleague.',
  likelihoodToPay: 'Would this persona pay from their stated budget today? 1 = never, 5 = credit card out.',
  likelihoodToRecommend: 'Would they tell a peer about it this week? 1 = no, 5 = unprompted evangelist.'
};

const CATEGORY_KEYS = Object.keys(CATEGORIES);

function validatePersona(p) {
  const errs = [];
  if (!p.id || !p.name || !p.profile || !p.weights) errs.push('missing id/name/profile/weights');
  const keys = Object.keys(p.weights || {});
  for (const k of keys) if (!CATEGORIES[k]) errs.push(`unknown weight category "${k}"`);
  for (const k of CATEGORY_KEYS) if (!(k in (p.weights || {}))) errs.push(`missing weight "${k}"`);
  const sum = keys.reduce((a, k) => a + p.weights[k], 0);
  if (Math.abs(sum - 1) > 1e-6) errs.push(`weights sum to ${sum.toFixed(3)}, expected 1.0`);
  return errs;
}

module.exports = { CATEGORIES, CATEGORY_KEYS, validatePersona };

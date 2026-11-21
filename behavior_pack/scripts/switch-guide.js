import { SWITCHES } from './switch-catalog.js';

export function guideBody() {
  const names = SWITCHES.flatMap(({ originalKey }) => [{ text: '\n• ' }, { translate: originalKey }]);
  return { rawtext: [
    { translate: 'secrets_expert.guide.instructions' },
    { text: '\n\n' },
    { translate: 'secrets_expert.guide.variants' },
    ...names,
  ] };
}

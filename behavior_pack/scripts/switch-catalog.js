export const NAMESPACE = 'secrets_expert';
export const GUIDE_ID = `${NAMESPACE}:switch_guide`;

export const SWITCHES = [
  ['torch', 'Fackel', 'Torch', 'torch', 14, '#EFE39D'],
  ['copper_torch', 'Kupferfackel', 'Copper Torch', 'torch', 14, '#B8EF8D'],
  ['oak_slab', 'Eichenstufe', 'Oak Slab', 'slab'],
  ['glass_pane', 'Glasscheibe', 'Glass Pane', 'pane'],
  ['soul_torch', 'Seelenfackel', 'Soul Torch', 'torch', 10, '#00FFFF'],
  ['skeleton_skull', 'Skelettschädel', 'Skeleton Skull', 'skull'],
  ['end_rod', 'Endstab', 'End Rod', 'rod', 14, '#FFFFFF'],
  ['dead_horn_coral_fan', 'Abgestorbener Geweihkorallenfächer', 'Dead Horn Coral Fan', 'coral'],
  ['glow_lichen', 'Leuchtflechte', 'Glow Lichen', 'lichen', 7],
].map(([original, de, en, model, light, lightColor]) => {
  const name = `switch_${original}`;
  return {
    original, de, en, model, light, lightColor, name,
    id: `${NAMESPACE}:${name}`,
    ingredient: `minecraft:${original}`,
    nameKey: `tile.${NAMESPACE}:${name}.name`,
    originalKey: `${NAMESPACE}.guide.original.${original}`,
  };
});

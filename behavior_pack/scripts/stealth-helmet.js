export const STEALTH_HELMET = 'secrets_expert:stealth_helmet';
export const SAVED_DISTANCE = 'secrets_expert:original_nameplate_distance';

export function reconcileHelmet(player, headItemType) {
  const savedDistance = player.getDynamicProperty(SAVED_DISTANCE);

  if (headItemType === STEALTH_HELMET) {
    const currentDistance = player.nameplateRenderDistance;
    // Save first so that a reload or failed write cannot lose the original value.
    if (savedDistance === undefined) player.setDynamicProperty(SAVED_DISTANCE, currentDistance);
    if (currentDistance !== 0) player.nameplateRenderDistance = 0;
    return;
  }

  if (typeof savedDistance === 'number') {
    if (player.nameplateRenderDistance !== savedDistance) player.nameplateRenderDistance = savedDistance;
    player.setDynamicProperty(SAVED_DISTANCE, undefined);
  }
}

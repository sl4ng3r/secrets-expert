import { STEALTH_HELMET } from './stealth-helmet.js';

const REFRESH_TICKS = 10;
// Invisible even when Bedrock falls back to its standard Actionbar text control.
const HUD_MARKER = '\u2063\u200B';
const HUD_ACTIVE = `${HUD_MARKER}\u2060`;

export function createStealthHud() {
  const nextRefreshByPlayer = new Map();

  return {
    update(player, tick, headItemType) {
      const nextRefresh = nextRefreshByPlayer.get(player.id);
      if (headItemType !== STEALTH_HELMET) {
        if (nextRefresh === undefined) return;
        player.onScreenDisplay.setActionBar({ rawtext: [{ text: HUD_MARKER }] });
        nextRefreshByPlayer.delete(player.id);
        return;
      }

      if (nextRefresh !== undefined && tick < nextRefresh) return;
      player.onScreenDisplay.setActionBar({ rawtext: [{ text: HUD_ACTIVE }] });
      nextRefreshByPlayer.set(player.id, tick + REFRESH_TICKS);
    },
    remove(playerId) {
      nextRefreshByPlayer.delete(playerId);
    },
  };
}

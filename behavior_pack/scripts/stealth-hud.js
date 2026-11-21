export const STEALTH_ON = '[secrets-expert:stealth:on]';
export const STEALTH_OFF = '[secrets-expert:stealth:off]';

const REFRESH_TICKS = 20;

export function createStealthHud() {
  const nextRefreshByPlayer = new Map();

  return {
    update(playerId, tick, active, send) {
      const nextRefresh = nextRefreshByPlayer.get(playerId);
      if (!active) {
        if (nextRefresh === undefined) return;
        send(STEALTH_OFF);
        nextRefreshByPlayer.delete(playerId);
      } else if (nextRefresh === undefined || tick >= nextRefresh) {
        send(STEALTH_ON);
        nextRefreshByPlayer.set(playerId, tick + REFRESH_TICKS);
      }
    },
    remove(playerId) {
      nextRefreshByPlayer.delete(playerId);
    },
  };
}

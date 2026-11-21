import { EntityComponentTypes, EquipmentSlot, system, world } from '@minecraft/server';
import { reconcileHelmet } from './stealth-helmet.js';
import { createStealthHud } from './stealth-hud.js';
import './switch-components.js';

let nextWarningTick = 0;
const stealthHud = createStealthHud();

world.afterEvents.playerLeave.subscribe(({ playerId }) => stealthHud.remove(playerId));

system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    try {
      if (!player.isValid) continue;
      const equipment = player.getComponent(EntityComponentTypes.Equippable);
      if (!equipment) continue;
      const helmet = equipment.getEquipment(EquipmentSlot.Head);
      const active = reconcileHelmet(player, helmet?.typeId);
      stealthHud.update(player.id, system.currentTick, active, (signal) => player.onScreenDisplay.setActionBar(signal));
    } catch (error) {
      // The player can become unavailable during respawn or disconnect.
      if (system.currentTick >= nextWarningTick) {
        console.warn(`[Secrets Expert] Could not update the Tarnhelm, retrying next tick. ${error}`);
        nextWarningTick = system.currentTick + 100;
      }
    }
  }
}, 1);

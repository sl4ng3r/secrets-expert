import { EntityComponentTypes, EquipmentSlot, system, world } from '@minecraft/server';
import { reconcileHelmet } from './stealth-helmet.js';
import { createStealthHud } from './stealth-hud.js';
import './switch-components.js';

const stealthHud = createStealthHud();
let nextWarningTick = 0;

world.afterEvents.playerLeave.subscribe(({ playerId }) => stealthHud.remove(playerId));

system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    try {
      if (!player.isValid) continue;
      const equipment = player.getComponent(EntityComponentTypes.Equippable);
      if (!equipment) continue;
      const helmet = equipment.getEquipment(EquipmentSlot.Head);
      reconcileHelmet(player, helmet?.typeId);
      stealthHud.update(player, system.currentTick, helmet?.typeId);
    } catch (error) {
      // The player can become unavailable during respawn or disconnect.
      if (system.currentTick >= nextWarningTick) {
        console.warn(`[Secrets Expert] Could not update the Tarnhelm, retrying next tick. ${error}`);
        nextWarningTick = system.currentTick + 100;
      }
    }
  }
}, 1);

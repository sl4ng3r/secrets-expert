import { EntityComponentTypes, EquipmentSlot, system, world } from '@minecraft/server';
import { reconcileHelmet } from './stealth-helmet.js';
import './switch-components.js';

let nextWarningTick = 0;

system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    try {
      if (!player.isValid) continue;
      const equipment = player.getComponent(EntityComponentTypes.Equippable);
      if (!equipment) continue;
      const helmet = equipment.getEquipment(EquipmentSlot.Head);
      reconcileHelmet(player, helmet?.typeId);
    } catch (error) {
      // The player can become unavailable during respawn or disconnect.
      if (system.currentTick >= nextWarningTick) {
        console.warn(`[Secrets Expert] Could not update the Tarnhelm, retrying next tick. ${error}`);
        nextWarningTick = system.currentTick + 100;
      }
    }
  }
}, 1);

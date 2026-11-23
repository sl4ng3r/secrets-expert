# Secrets Expert

Minecraft-Bedrock-Add-on für Realms ab 26.40. Stabile Script APIs `@minecraft/server` 2.8.0 und `@minecraft/server-ui` 2.0.0.

## Aufbau

- `behavior_pack/` enthält Item, Rezept und Skript. `minecraft:wearable` steuert die Ortung. `scripts/main.js` liest den Kopfslot, `scripts/stealth-helmet.js` gleicht die Namensschilddistanz ab. `scripts/stealth-hud.js` sendet unsichtbare Actionbar-Signale für das Tarnsymbol in `resource_pack/ui/hud_screen.json`.
- `behavior_pack/scripts/switch-catalog.js` ist die gemeinsame Quelle für Geheimschalter und Handbuch. Bei jedem neuen Schalter Katalog, Rezept, deutsche und englische Namen sowie den im Spiel sichtbaren Handbuchinhalt gemeinsam aktualisieren und testen. Rezepte, Blöcke und Schalterübersetzungen mit `node tools/generate-switches.js` nachführen.
- `switch-logic.js` definiert die vier Wandrichtungen und verarbeitet Benutzungsklicks aus dem abbrechbaren Block-Interaktionsereignis. Bedrock speichert Platzierungsrichtung und Impulszustand im Schalterblock. Ein Block-Tick schaltet den Impuls ab.
- Alle Add-on-Rezepte verwenden `AlwaysUnlocked`.
- `resource_pack/` enthält Icons, Modelle, Anzeigenamen für `de_DE` und `en_US` sowie die generierten Auslöser für Vanilla-Flammen- und Rauchpartikel. Beide Packs verwenden dasselbe `pack_icon.png` (256 × 256).
- Bedrock speichert die ursprüngliche Namensschilddistanz als dynamische Eigenschaft beim Spieler in der Welt. Das Add-on benötigt keinen eigenen Dienst und keine Datenbank. Die Welt und das Deployment verwaltet Minecraft Realms.

## Befehle

- `node tools/generate-switches.js --check` prüft, ob Katalog und erzeugte Pack-Dateien zusammenpassen.
- `node --test tests/*.test.js` prüft Helm, Schalterlogik und Handbuchinhalt.
- `python3 -B -m unittest discover -s tests` prüft die Pack-Dateien und das Archiv.
- `python3 tools/build_addon.py` baut `dist/secrets-expert.mcaddon`. `python3 tools/build_addon.py --check` vergleicht Archiv und aktuelle Packs. `npm run build` führt Generierung, Tests, Build und Archivprüfung zusammen aus.

## Deployment

Das `.mcaddon` in Bedrock importieren und beide Packs zunächst in einem separaten Realm-Weltslot prüfen. Die gegenseitigen Abhängigkeiten in den Manifesten aktivieren beide Packs gemeinsam. Vor einem Update der Hauptwelt ein Backup anlegen. Bei Updates Pack-UUIDs, Item- und Block-IDs und den Schlüssel der dynamischen Eigenschaft beibehalten. Versionsnummern in `package.json`, beiden Manifesten und den gegenseitigen Pack-Abhängigkeiten gemeinsam erhöhen. Vor jedem Push mit Pack-Änderungen das aktuelle `dist/secrets-expert.mcaddon` neu bauen, mit `--check` prüfen und mit den Quellen committen. Die Import- und Abnahmeschritte stehen in `README.md`.

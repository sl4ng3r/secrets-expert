# Secrets Expert

## Geheimschalter und Handbuch

Alle elf Rezepte des Add-ons sind im Rezeptbuch von Anfang an freigeschaltet. Zum Herstellen brauchst du die jeweiligen Zutaten. Wähle im Rezeptbuch die Anzeige aller Rezepte, um auch Einträge mit fehlenden Zutaten zu sehen.

Ein Originalgegenstand und ein **Redstone-Staub** ergeben an der Werkbank einen Geheimschalter. Das Rezept ist formlos. Befestige den Schalter seitlich an einer festen Wand, etwa aus Stein, Bruchstein, Steinziegeln, Tiefenschiefer oder Brettern. Benutze ihn mit leerer Hand. Er gibt einen kurzen Redstone-Impuls in den Block hinter ihm ab.

Aus **einem Buch und einem Redstone-Staub** craftest du das **Geheimschalter-Handbuch**. Benutze es beim Halten, um alle verfügbaren Schalter nachzuschlagen.

| Für frühes Survival | Weitere Wandvarianten |
| --- | --- |
| Fackel | Seelenfackel |
| Kupferfackel | Skelettschädel |
| Eichenstufe | Endstab |
| Glasscheibe | Abgestorbener Geweihkorallenfächer |
| | Leuchtflechte |

## Tarnhelm

Ein Lederhelm und ein Tintensack ergeben an der Werkbank einen **Tarnhelm**. Die Anordnung ist frei. Alternativ findest du den Helm unter **Ausrüstung** im Kreativinventar.

Beim Tragen blendet das Add-on das Namensschild über deinem Kopf aus. Bedrock verbirgt zusätzlich deinen Marker auf der Locator-Leiste und auf Ortungskarten. Deine Spielfigur bleibt sichtbar. Rechts oben in deinem eigenen HUD zeigt dir ein Helm-Icon den aktiven Tarnstatus an. Der Helm hat keine Rüstungspunkte und verschleißt nicht.

## In einem Realm installieren

1. Öffne die aktuelle [Installationsdatei `secrets-expert.mcaddon`](dist/secrets-expert.mcaddon) mit einem Bedrock-Client ab **26.40**, der Add-on-Dateien importieren kann. Die beiden importierten Packs heißen **Secrets Expert** und **Secrets Expert – Ressourcen**.
2. Öffne als Realm-Besitzer den Realm Hub. Wähle unter **Welt** einen separaten Test-Weltslot aus und öffne **Welt bearbeiten**.
3. Aktiviere **Secrets Expert** unter Verhaltenspakete oder **Secrets Expert – Ressourcen** unter Ressourcenpakete. Dank der gegenseitigen Abhängigkeit aktiviert Bedrock das jeweils andere Paket mit. Lass die Experimente ausgeschaltet.
4. Kehre zum Realm Hub zurück und warte auf den Upload. Tritt der Testwelt mit beiden Bedrock-Clients bei. [Minecraft Help · Add-ons im Realm aktivieren](https://help.minecraft.net/hc/en-us/articles/24120525083533-How-to-activate-Minecraft-Add-On)

## Abnahme mit zwei Spielern

- **Geheimschalter.** Beginne mit der Fackel an allen vier Seiten eines Steinblocks. Nimm das Signal hinter dem Stein mit einem Repeater ab. Prüfe einen etwa einsekündigen Impuls, zwei schnelle Klicks, gehaltene Benutzung, Platzieren mit einem Baustoff in der Hand sowie die normale Vanilla-Fackel als Vergleich. Entferne den Träger und lade den Chunk während eines Impulses neu. Nach erneutem Laden darf der Schalter nicht dauerhaft an bleiben. Wiederhole die Prüfung für die acht übrigen Varianten. Vergleiche Fackellicht, beide Halbpositionen der Eichenstufe und den Anschluss der Glasscheibe an ein normales Fenster.
- **Handbuch.** Stelle es im Survival her, öffne es über Benutzen und prüfe in deutscher und englischer Spielsprache Inventar-Icon, Titel, Rezept und alle neun Einträge.
- **Darstellung.** Prüfe die Pack-Icons und Anzeigenamen in den Paketübersichten, die vom Hauptmenü und über die Welteinstellungen erreichbar sind. Prüfe das Helm-Icon und den Namen **Tarnhelm** bzw. **Stealth Helmet** im Inventar, in der Schnellleiste und im Rezeptbuch auf Deutsch und Englisch. Vergleiche das Modell auf dem Kopf mit dem Icon.
- **Tarnung.** Aktiviere Spieler-Wegpunkte für alle. Prüfe zuerst, dass der Beobachter den Namen, den Punkt auf der Leiste und den Marker auf einer Ortungskarte sieht. Setze den Helm im Stehen auf. Prüfe, dass das Helm-Icon nur beim Träger angezeigt wird und beim Absetzen verschwindet. Der Beobachter prüft Name und Marker im direkten Nahbereich und hinter einer Wand. Nach dem Absetzen müssen sie wieder sichtbar sein. Tauscht die Rollen. Der Test gilt erst als bestanden, wenn auch direkt vor dem Träger kein Namensschild zu sehen ist.
- **Spielablauf.** Stelle den Helm im Survival her. Rüste ihn über das Inventar und über Benutzen aus. Prüfe, dass Halten allein keine Tarnung auslöst, und tausche ihn gegen einen normalen Helm. Wiederhole die Sichtprüfung nach Dimensionswechsel, Wiederbeitritt und Tod. Nach einem Tod richtet sich die Tarnung danach, welcher Helm nach dem Respawn tatsächlich im Kopfslot liegt.

Nimm vor dem Deaktivieren des Packs die Tarnhelme in der Welt ab und lass den Skriptabgleich laufen, damit die ursprüngliche Distanz wiederhergestellt wird. Prüfe neue Versionen in einem Test-Weltslot, bevor du sie in der Hauptwelt aktivierst.

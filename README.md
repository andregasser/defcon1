# ▲ Defcon 1

Task-Board für mehrere parallel laufende Projekte. Läuft lokal, ohne Login, ohne
Cloud. Ein Swimlane pro Projekt, fünf Status-Spalten, Tasks per Maus verschieben.

```
                 Backlog     Todo    In Progress   Blocked    Done
Reporting Q4  │    ▓▓        ▓▓▓         ▓            ▓        ▓▓
Migration     │    ▓▓▓▓      ▓           ▓▓                    ▓▓▓
Onboarding    │    ▓         ▓▓                                ▓
```

## Starten

```bash
npm install
npm start          # baut das Frontend und startet den Server
```

Dann `http://127.0.0.1:7777` im Browser öffnen — in Safari, Firefox, Chrome oder
allen gleichzeitig.

| Befehl | Zweck |
| --- | --- |
| `npm start` | Build + Server (der normale Weg) |
| `npm run serve` | Nur den Server starten, ohne neu zu bauen |
| `npm run dev` | Vite-Dev-Server (`:5173`) + API-Server, mit Hot Reload |
| `npm test` | Vitest, 79 Tests |
| `npm run typecheck` | TypeScript strict prüfen |

Umgebungsvariablen: `DEFCON1_PORT` (Standard `7777`), `DEFCON1_HOST` (Standard
`127.0.0.1`), `DEFCON1_DATA_DIR` (Standard `./data`).

Soll das Board auch vom Tablet oder einem zweiten Rechner im gleichen LAN
erreichbar sein: `DEFCON1_HOST=0.0.0.0 npm start`. Achtung — es gibt keine
Authentifizierung, also nur in einem Netz, dem du traust.

## Wo liegen die Daten?

In `data/board.json`. Genau eine Datei auf der Platte, nicht im Browser — das ist
der Grund, warum es den kleinen Server überhaupt gibt.

localStorage funktioniert zwar in jedem Browser, ist aber **pro Browser
getrennt**: was du in Safari anlegst, sieht Firefox nie. Safari löscht es bei
`file://`-Seiten zusätzlich nach sieben Tagen Inaktivität. Deshalb hält der
Server die Wahrheit und alle Browser reden mit ihm.

* **Konflikte**: jeder Speichervorgang trägt einen `rev`-Zähler. Wer mit einem
  veralteten Stand schreibt, bekommt HTTP 409, das Board übernimmt den
  Serverstand und sagt es dir in der Hinweiszeile.
* **Zweiter Browser**: alle 4 Sekunden wird nachgefragt, fremde Änderungen
  erscheinen also von selbst.
* **Sicherheit gegen Datenverlust**: geschrieben wird über eine temporäre Datei
  plus `rename`, ein Absturz kann die Datei nie halb überschreiben. Vor jedem
  Schreiben landet eine Kopie in `data/backups/` (die letzten 20 bleiben).
* **Ohne Server**: das Frontend fällt automatisch auf localStorage zurück und
  zeigt oben rechts „nur dieser Browser". Startest du den Server später, wird
  ein bestehendes localStorage-Board einmalig übernommen.
* **Von Hand**: `Export` legt eine JSON-Datei ab, `Import` liest sie zurück. Der
  Server ist ein Prozess mit einer Datei — du darfst `data/board.json` auch
  einfach kopieren, versionieren oder in einen Sync-Ordner legen.

Ansichtseinstellungen (Dichte, Sortierung, eingeklappte Lanes, Fokus) liegen
absichtlich in localStorage: die sind pro Gerät sinnvoll, nicht global.

## DEFCON statt Prioritäten

| Level | Farbe | Codewort | Bedeutung |
| --- | --- | --- | --- |
| 1 | weiss | COCKED PISTOL | sofort |
| 2 | rot | FAST PACE | kritisch |
| 3 | gelb | ROUND HOUSE | wichtig |
| 4 | grün | DOUBLE TAKE | normal |
| 5 | blau | FADE OUT | irgendwann |

Jede Karte trägt einen farbigen Streifen links. DEFCON 1 und 2 gelten als „hot"
und werden in der Lane und im Command Deck gezählt.

## Zehn parallele Projekte

Dafür ist das UI gebaut:

* **Command Deck** oben: eine Kachel pro Projekt mit Deadline-Countdown,
  Fortschritt und den Zählern offen / doing / blocked / hot / überfällig. Ein
  Klick fokussiert das Projekt, mehrere Klicks fokussieren mehrere. Doppelklick
  öffnet die Projekteinstellungen.
* **Deadline pro Projekt**: Tagesdatum plus Countdown, in der Lane und auf der
  Kachel. Lanes sind standardmässig nach Deadline sortiert, die dringendste oben.
* **Liegezeit**: jede Karte merkt sich, wann sie in ihre aktuelle Spalte kam.
  Bleibt sie zu lange stehen — In Progress ab 3 Tagen, Blocked ab 2 —, trägt sie
  ein violettes `◴ 6 T`, und Lane, Kachel und Kopfzeile zählen die
  Stehengelassenen. DEFCON sagt, was wichtig ist; die Liegezeit sagt, was
  vergessen wurde. Umsortieren in der Spalte oder ein Wechsel des Projekts
  starten die Uhr nicht neu, nur ein echter Spaltenwechsel.
* **Checkliste pro Task**: im Task-Dialog beliebig viele Schritte anlegen,
  abhaken, umbenennen, löschen. Die Karte zeigt nur den Stand — `☐ 1/3`, grün
  `☑ 3/3`, wenn alles erledigt ist. Ein Schritt ist absichtlich kein Task: er hat
  keinen Status, kein DEFCON und keinen Platz auf dem Board, sonst wäre die Lane
  in einer Woche unlesbar.
* **Heute** (`t`): eine flache Liste quer über alle Projekte, gruppiert nach
  Druck statt nach Projekt — Überfällig, Heute fällig, In Arbeit, Brennt
  (DEFCON 1–2, nicht in Arbeit). Jeder Task steht in genau einer Gruppe, die
  schärfste gewinnt, damit die Zahlen etwas bedeuten. Die Liste ignoriert Suche
  und DEFCON-Filter — sie hat ihre eigene Vorstellung von dringend —, respektiert
  aber den Projektfokus. Auswahl und Tasten (`1`–`5`, `e`, `x`, `⌫`) wirken wie
  auf dem Board.
* **Sticky Spaltenköpfe und Lane-Schiene**: beim Scrollen bleibt sichtbar, wo du
  bist.
* **Gedeckelte Zellenhöhe**: eine überfüllte Lane scrollt intern statt die
  anderen aus dem Bild zu schieben.
* **Lanes einklappen** — einzeln über das Chevron, alle über `c`. Eingeklappt
  bleibt eine Zusammenfassungszeile.
* **Dichte** `Komfort` / `Kompakt` (`d`): kompakt bringt deutlich mehr Lanes auf
  den Schirm.
* **Done schmal**: schrumpft die Done-Spalte auf die Zählung und gibt die Breite
  den arbeitenden Spalten.
* **Leere Lanes aus**: blendet Projekte ohne passende Tasks aus.
* **DEFCON-Filter und Suche**: zeigt quer über alle Projekte nur das Brennende.

## Bedienung

### Maus

* Karte ziehen — zwischen Spalten, zwischen Projekten, innerhalb einer Spalte
  neu einsortieren.
* Klick wählt eine Karte, Doppelklick öffnet sie.
* `+ Task` erscheint beim Überfahren einer Zelle.

### Tastatur

| Taste | Wirkung |
| --- | --- |
| `1`–`5` | gewählten Task in Backlog / Todo / In Progress / Blocked / Done |
| `Shift`+`1`–`5` | DEFCON des gewählten Tasks setzen |
| `t` | Heute-Ansicht über alle Projekte ein-/ausschalten |
| `n` | neuer Task im ersten sichtbaren Projekt |
| `p` | neues Projekt |
| `e` | gewählten Task öffnen |
| `x` | gewählten Task auf Done / zurück auf Todo |
| `Backspace` / `Delete` | gewählten Task löschen (mit Rückfrage) |
| `/` | Suchfeld |
| `c` | alle Lanes ein-/ausklappen |
| `d` | Dichte umschalten |
| `?` | Hilfe |
| `Escape` | Quick-Add → Auswahl → Suche → Filter → Fokus → Heute, in dieser Reihenfolge |

### Quick-Add-Syntax

Im `+ Task`-Feld direkt mitschreiben:

```
Firewall-Ticket eröffnen !2 @morgen
```

* `!1` … `!5` setzt DEFCON.
* `@heute`, `@morgen`, `@mo`…`@so`, `@+3d`, `@+2w`, `@20.09.`, `@20.09.2027`,
  `@2026-09-20` setzen das Fälligkeitsdatum.
* Was nicht als Token aufgeht, bleibt einfach im Titel stehen.

## Aufbau

```
server/server.mjs   HTTP-Server ohne Dependencies: /api/state + dist/
scripts/dev.mjs     startet Vite und den API-Server zusammen
src/App.tsx         Orchestrierung, Drag & Drop, Shortcuts
src/components/     Board, Cell, TaskCard, LaneHeader, CommandDeck, TodayView, Dialoge
src/hooks/          useBoard (Daten + Sync), usePrefs (Ansicht)
src/lib/            board (reine Logik), date, quickAdd, storage, today
src/__tests__/      Logik- und UI-Tests
data/board.json     deine Daten
```

Stack: React 19, TypeScript strict, Vite 7, `@dnd-kit` für Drag & Drop, Vitest.
Der Server kommt ohne jede Laufzeit-Dependency aus.

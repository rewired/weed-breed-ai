# Gameplay-Fassade (`@/game/api`)

Die Fassade unter `@/game/api` bündelt alle öffentlichen Einstiegsfunktionen für Simulation, Telemetrie und Gesundheitsdaten. Sie kapselt den `EngineAdapter` sowie interne Loader, damit UI- und Tooling-Teams ohne tiefe Modulkenntnis arbeiten können. Dieses Dokument beschreibt die Exportoberfläche, das Eventmodell und die wichtigsten DTOs.

## Ziele & Prinzipien

- **Stabile Verträge:** Konsumenten greifen ausschließlich über `@/game/api` auf die Simulation zu. Interne Pfade (z. B. `src/game/internal`) bleiben austauschbar.
- **Deterministische Steuerung:** Start-, Pause- und Step-Aufrufe führen deterministische Tick-Übergänge aus. Alle Events enthalten `tick` und `timestamp`.
- **Sichere Erweiterbarkeit:** Neue Events oder DTO-Felder sind additive Änderungen. Bestehende Felder werden nicht entfernt.

## Schnellstart

```ts
import {
  start,
  pause,
  step,
  setSpeed,
  on,
  getSnapshot,
  applyTreatment,
  listTreatments,
  listHealthDefs,
} from '@/game/api';
```

1. **Simulation bootstrappen:** `await start({ companyName, seed, reset })` initialisiert Zustand, primt den Jobmarkt und liefert eine `WorldSummaryDTO` zurück.
2. **Events abonnieren:** `const off = on('sim:tick', handleTick)` registriert Listener; der Rückgabewert entfernt den Listener wieder.
3. **Loop steuern:** `setSpeed(speed)` passt die Tickfrequenz an, `pause()` stoppt das Intervall, `await step()` erzwingt genau einen Tick.
4. **Snapshot ziehen:** `getSnapshot()` liefert den letzten `WorldSummaryDTO`-Stand ohne neuen Tick.
5. **Behandlungen auslösen:** `applyTreatment()` liefert aktuell nur ein standardisiertes Fehlerobjekt, bleibt aber die Schnittstelle für spätere Maßnahmen.
6. **Stammdaten laden:** `listTreatments()` und `listHealthDefs()` liefern katalogisierte Optionen bzw. Definitionen aus dem Health-Modul.

## Events & EventBus

Die Fassade verwendet einen synchronen `EventBus`. Listener werden sofort zur Tickzeit aufgerufen – blockierende oder fehlerhafte Listener verzögern den Loop. Guardrails:

- Fehler im Listener werden abgefangen und geloggt, beenden aber nicht den Bus.
- Verwenden Sie den Rückgabewert von `on(...)`, um Listener bei Komponenten-Unmounts zuverlässig zu deregistrieren.
- Die Eventnamen sind typsicher (`SimulationEventName`), wodurch TypeScript den Payload-Typ aus `SimulationEventMap` ableitet.

### Eventübersicht

| Eventname        | Auslöser                                                  | Payload DTO              | Hinweise |
| ---------------- | --------------------------------------------------------- | ------------------------ | -------- |
| `sim:tick`       | Nach erfolgreichem `gameTick`                             | `SimTickEventDTO`        | Enthält Kapitalveränderungen, aktiven Speed und Health-Aggregate. |
| `finance:update` | Für jede neue Buchungsdifferenz seit letztem Tick        | `FinanceUpdateEventDTO`  | Liefert Delta pro Einnahmen-/Ausgabenkategorie. |
| `health:event`   | Bei jedem Tick nach Health-Aggregation                    | `HealthEventDTO`         | Aggregierte Gesundheits- und Stresswerte samt kritischen Pflanzen. |
| `world:summary`  | Bei jeder Initialisierung sowie nach jedem Tick           | `WorldSummaryDTO`        | Globale Totals und aktive Alerts, geeignet für Dashboard-Header. |
| `alert:event`    | Für neu erkannte Alerts im Vergleich zum vorherigen Tick | `AlertEventDTO`          | Liefert Standortinformationen für UI-Highlighting. |

## DTO-Leitfaden

Die DTOs sind in `src/game/api/dto.ts` definiert. Wichtige Felder:

- **`WorldSummaryDTO`** – Unternehmens-ID/-Name, Kapital, kumulierte Erträge sowie Totals für Strukturen, Räume, Zonen, Plantings, Pflanzen und Geräte.
- **`SimTickEventDTO`** – Tick, `timestamp`, aktueller `GameSpeed`, RNG-Seed, Kapitalstand und Delta, kumulierte Erträge sowie `plantHealth`-Auszug und Anzahl aktiver Alerts.
- **`HealthEventDTO`** – Pflanzanzahl, Durchschnittswerte für Health/Stress, Minimum sowie Liste kritischer Pflanz-IDs.
- **`FinanceUpdateEventDTO`** – Delta pro Kategorie, positives Delta für Erlöse, negatives Delta für Kosten (`reason` präfixiert mit `revenue:` oder `expense:`).
- **`AlertEventDTO`** – Neue Alerts inklusive strukturierter Lokation (`AlertLocationDTO`).
- **`SimulationStartOptions`** – Optionales `companyName`, deterministischer `seed` sowie `reset`-Flag für harte Neustarts.
- **`ApplyTreatmentResult`** – Platzhalterstruktur für die zukünftige Maßnahmenverarbeitung.

Alle DTOs verwenden SI-konforme Einheiten wie im Projektstandard festgelegt (z. B. Gramm für Biomasse, Euro für Kapital implizit). Felder werden niemals in-place mutiert; erstellen Sie bei Ableitungen Kopien.

## Steuerung & Tick-Regeln

- `start()` und `step()` initialisieren bei gesetztem `reset` immer einen frischen Zustand (inklusive deterministischer RNG-Seed-Initialisierung via `mulberry32`).
- `setSpeed()` setzt eine Obergrenze von 10 Hz (`MIN_TICK_INTERVAL_MS`). Höhere Werte werden automatisch auf diese Grenze gekappt.
- `pause()` stoppt lediglich das Intervall; bereits laufende Ticks werden zu Ende geführt.
- Der EngineAdapter sendet beim Initialisieren direkt einen `world:summary` und `health:event`, bevor weitere Ticks laufen.

## Best Practices

- **Keine Deep Imports:** UI-Schichten importieren ausschließlich aus `@/game/api`, nicht aus `@/game/internal` oder ähnlichen Pfaden.
- **Listener räumen:** Verwenden Sie die Rückgabefunktion von `on(...)` oder kapseln Sie Abos in React `useEffect`, um Leaks zu vermeiden.
- **Keine Blockaden:** Event-Handler sollten maximal Daten sammeln und Rendering triggern. Schwergewichtige Berechnungen in Worker auslagern.
- **Testbarkeit:** Mocken Sie den EventBus bei Unit-Tests, indem Sie `on` und `emit` über die Fassade stubben. DTOs können direkt aus `@/game/api` importiert werden.

Durch diese Leitplanken bleibt die Gameplay-Fassade austauschbar, während Frontend- und Tooling-Teams eine klar dokumentierte API erhalten.

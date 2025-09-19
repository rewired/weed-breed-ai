# Deprecation-Policy

Diese Richtlinie beschreibt, wie wir Altmodule kennzeichnen, ohne sie zu entfernen. Ziel ist es, Konsumenten rechtzeitig über Ablösungen zu informieren und Migrationspfade transparent zu halten, während die bestehende Funktionalität funktionsfähig bleibt.

## Grundprinzipien

1. **Keine stillen Brüche:** Deprecated-APIs liefern weiterhin dieselben Ergebnisse, solange sie bestehen.
2. **Dokumentation statt Löschung:** Jede Abkündigung wird hier dokumentiert und im Code markiert.
3. **Alternativen anbieten:** Nennt immer eine empfohlene Nachfolge-API oder Workaround.
4. **Verbindliche Kommunikation:** Konsumenten sehen Deprecation-Hinweise sowohl im Code (TypeScript IntelliSense) als auch in der Laufzeit (Dev-Warnung).

## Kennzeichnungsschritte

1. **Dokumentation ergänzen:** Fügen Sie im Abschnitt [Registrierte Deprecations](#registrierte-deprecations) einen Eintrag mit Modul, Datum, Begründung und empfohlenem Ersatz hinzu.
2. **Code markieren:** Verwenden Sie einen JSDoc-Kommentar direkt am Export. Beispiel:

   ```ts
   /**
    * @deprecated Verwende stattdessen `@/game/api` → `start`.
    */
   export function legacyStart(...) { /* ... */ }
   ```

3. **Dev-Warnung ausgeben:** Hinterlegen Sie im betroffenen Modul einen `console.warn` mit Hinweis und Zielversion, jedoch nur in Nicht-Produktivumgebungen:

   ```ts
   if (process.env.NODE_ENV !== 'production') {
     console.warn('[deprecation] legacyStart ist veraltet und wird ab v1.2 entfernt.');
   }
   ```

4. **Verwendung einschränken:** Ergänzen Sie bei Bedarf ESLint-Regeln (`no-restricted-imports`), um Neubefüllung zu verhindern.
5. **Migrationspfad beschreiben:** Falls zusätzliche Schritte nötig sind (z. B. DTO-Konvertierungen), dokumentieren Sie diese im jeweiligen Modul-README.

## Lifecycle

- **Ankündigung:** Deprecation-Eintrag in diesem Dokument + Release Notes.
- **Übergangsphase:** Mindestens zwei Minor-Versionen Laufzeit mit Warnungen und Tests.
- **Entfernung:** Erst wenn alle abhängigen Module migriert sind und eine Freigabe erfolgt ist. Die Entfernung erhält einen eigenen Changelog-Eintrag.

## Registrierte Deprecations

| Modul / Export        | Seit Version | Ersatz / Aktion                | Status          |
| --------------------- | ------------ | ------------------------------ | --------------- |
| *(frei für zukünftige Einträge)* | –            | –                            | Aktiv (legacy) |

## Review-Checkliste

- [ ] JSDoc `@deprecated` gesetzt
- [ ] Warnung in Dev-Builds vorhanden
- [ ] Alternative dokumentiert
- [ ] Tests angepasst (keine direkten Abhängigkeiten mehr in neuem Code)
- [ ] Eintrag in `docs/deprecation.md`

Mit diesem Prozess bleiben Altmodule nachvollziehbar, ohne laufende Features zu gefährden.

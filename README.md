# Workout

Web-App (Vite, React, shadcn) als Android-App via Capacitor. Plan: `../Plan v2.md`.

## Befehle

- `npm run dev` – Entwicklung im Browser
- `npm test` – Regeln (Einheit, Gewicht, Volumen, Entlastung, Timer)
- `npm run exercises` – Übungsdaten aus `../data/repdb` neu zuschneiden
- `npm run apk` – Debug-APK bauen (`JAVA_HOME` = `C:\Program Files\Android\Android Studio\jbr`), Ergebnis: `android/app/build/outputs/apk/debug/app-debug.apk`

## Struktur

- `src/data/plan.ts` – Trainingsplan als Code
- `src/lib/` – Logik ohne UI: `schedule`, `progression`, `volume`, `deload`, `timer`; `workout.ts` verbindet sie mit der Datenbank (Dexie)
- `src/screens/` – Heute, Fortschritt, Plan, Session, Cardio

Exercise data by [RepDB](https://repdb.co). Sissy-Squat-Bilder: free-exercise-db (Public Domain).

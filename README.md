# Mini-Bridge Helfer

Web-App für die Anmeldung von Helfern an Mini-Bridge Einführungskursen.

## Features

- Mitglieder melden sich mit Name an und tragen sich für Termine ein
- Variable Standorte und Termine (vollständig im Admin verwaltbar)
- Admin-Bereich mit Passwortschutz
- Standorte & Termine hinzufügen / bearbeiten / löschen
- Helfer-Eintragungen einsehen und entfernen
- Export als CSV (Excel) und JSON
- Datenspeicherung via [Pantry](https://getpantry.cloud) (kostenlos, kein Backend nötig)

## Setup

### 1. Pantry-Account erstellen

1. Gehe zu [getpantry.cloud](https://getpantry.cloud)
2. Klicke auf **"Create Pantry"** und gib eine E-Mail-Adresse ein
3. Kopiere deine **Pantry-ID** aus dem Dashboard

### 2. Konfiguration anpassen

Öffne `js/config.js` und trage deine Werte ein:

```js
const CONFIG = {
  PANTRY_ID: 'deine-pantry-id-hier',   // von getpantry.cloud
  BASKET: 'minibridge',                 // nicht ändern
  ADMIN_PASSWORD: 'dein-passwort',      // Admin-Passwort wählen
  APP_TITLE: 'Mini-Bridge Helfer',
  DEFAULT_MAX_HELFER: 3,
};
```

### 3. Auf GitHub Pages deployen

```bash
# Repository auf GitHub erstellen, dann:
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/DEIN-USERNAME/DEIN-REPO.git
git push -u origin main
```

Danach im GitHub Repository:
- **Settings → Pages → Source: "Deploy from a branch"**
- Branch: `main`, Ordner: `/ (root)`
- **Save** klicken

Die App ist dann erreichbar unter:
`https://DEIN-USERNAME.github.io/DEIN-REPO/`

## Admin-Bereich

- Erreichbar über den Link "Admin-Bereich" auf der Login-Seite
- Passwort: wie in `config.js` gesetzt (Standard: `bridge2024`)
- Funktionen: Standorte & Termine verwalten, Helfer einsehen, CSV/JSON Export

## Offline-Betrieb

Ohne Pantry-ID werden alle Daten im Browser-LocalStorage gespeichert (nur lokal, nicht geteilt).

## Dateistruktur

```
index.html          # Hauptseite
css/style.css       # Stylesheet
js/config.js        # Konfiguration (Pantry-ID, Passwort)
js/storage.js       # Pantry-Datenspeicher
js/app.js           # App-Logik
README.md
```

# Binoxxo

Binoxxo-Rätsel fürs iPhone: unbegrenzt neue Rätsel, drei Schwierigkeitsstufen,
läuft offline und im Vollbild. Kein Konto, keine Werbung, kein Server.

![Icon](icons/icon-192.png)

## Spielregeln

- Jedes Feld im 10×10-Gitter bekommt ein **X** oder ein **O**.
- Nie mehr als **zwei gleiche** Zeichen direkt nebeneinander oder untereinander.
- Jede Zeile und jede Spalte hat **gleich viele** X und O (je 5).
- Keine zwei Zeilen und keine zwei Spalten sind **gleich**.

## Bedienung

| | |
|---|---|
| **Feld antippen** | wechselt reihum: leer → O → X → leer |
| Helle Felder mit weißen Zeichen | sind vorgegeben und lassen sich nicht ändern. Eigene Einträge sind gelb. |
| **Hinweis** | Alle Felder, die man jetzt schon sicher bestimmen kann, leuchten weiß. Ist schon ein Fehler im Gitter, sagt die App das stattdessen. |
| **Prüfen** | Zeigt, ob bisher ein Fehler gemacht wurde, und färbt falsche Felder rot. |
| **Zurück** | Macht den letzten Schritt rückgängig, beliebig oft bis zum Anfang. |
| **Neustart** | Setzt das aktuelle Rätsel auf den Anfang zurück (mit Rückfrage). |
| **Neues Rätsel** | Leicht, Mittel oder Schwer wählen. |
| **Uhr oben** | Zeit für das aktuelle Rätsel. Läuft nur, solange die App offen ist. |
| **☀️ / 🌙 oben rechts** | Wechselt zwischen hellem und dunklem Modus. Am Anfang richtet sich die App nach der iPhone-Einstellung. |

Der Spielstand wird automatisch auf dem Gerät gespeichert.

---

## Veröffentlichen (einmalig, kostenlos)

Die App besteht nur aus fertigen Dateien. Es muss nichts gebaut werden.

### Weg A: GitHub Pages (empfohlen)

1. Auf [github.com](https://github.com) anmelden (oder kostenlos registrieren).
2. Oben rechts auf **+** → **New repository** tippen.
   Name z. B. `binoxxo`, Sichtbarkeit **Public**, sonst nichts ankreuzen → **Create repository**.
3. Dieses Projekt hochladen. Am Computer im Projektordner:
   ```sh
   git remote add origin https://github.com/DEIN-NAME/binoxxo.git
   git push -u origin main
   ```
   Ohne Git geht es auch: Auf der leeren Repository-Seite **uploading an existing file**
   anklicken und alle Dateien und Ordner hineinziehen, dann **Commit changes**.
4. Im Repository auf **Settings** → links **Pages**.
5. Unter **Build and deployment**: Source **Deploy from a branch**, Branch **main**, Ordner **/ (root)** → **Save**.
6. Ein bis zwei Minuten warten. Oben auf derselben Seite erscheint die Adresse, z. B.
   `https://DEIN-NAME.github.io/binoxxo/`. Das ist die Adresse für das iPhone.

### Weg B: Netlify Drop (ohne GitHub)

1. [app.netlify.com/drop](https://app.netlify.com/drop) im Browser am Computer öffnen.
2. Den ganzen Projektordner auf die Seite ziehen.
3. Netlify zeigt eine Adresse wie `https://irgendwas-123.netlify.app`.
   Damit die Seite dauerhaft bleibt, kostenlos anmelden und die Seite „claimen“.
   Unter **Site configuration** kann man den Namen ändern, z. B. `binoxxo-papa.netlify.app`.

> Wichtig: Die Adresse muss mit **https://** beginnen, sonst funktioniert der Offline-Modus nicht.
> GitHub Pages und Netlify machen das automatisch.

## Auf dem iPhone installieren

1. Auf dem iPhone **Safari** öffnen (nicht Chrome, nur Safari kann das).
2. Die Adresse von oben eingeben und die Seite laden.
3. Unten in der Mitte auf das **Teilen-Symbol** tippen (Quadrat mit Pfeil nach oben).
   Bei neueren iOS-Versionen zuerst auf **•••** tippen, dann auf **Teilen**.
4. Etwas nach unten wischen und **„Zum Home-Bildschirm“** wählen.
5. Oben rechts auf **Hinzufügen** tippen.
6. Fertig: Auf dem Home-Bildschirm ist jetzt das Binoxxo-Symbol. Von dort öffnen,
   dann läuft die App im Vollbild ohne Adressleiste.

Nach dem ersten Öffnen funktioniert die App auch ohne Internet (Flugmodus).

## Updates einspielen

1. Dateien ändern, in `sw.js` die Zeile `const VERSION = 'binoxxo-v2'` um eins hochzählen (`v3`, `v4`, …).
2. Neu hochladen (bzw. `git push`).
3. Auf dem iPhone die App mit Internet öffnen. Sie findet das Update selbst und lädt sich
   einmal kurz neu. Der Spielstand bleibt dabei erhalten. GitHub speichert Dateien bis zu
   10 Minuten zwischen, direkt nach dem Hochladen kann es also etwas dauern.

---

## Technik

- Reines HTML, CSS und JavaScript (ES-Module), **keine Abhängigkeiten, kein Build-Schritt**.
- `js/binoxxo.js`: Regeln, logischer Löser, Lösungszähler, Generator.
- `js/app.js`: Oberfläche, Eingabe, Speichern (`localStorage`).
- `sw.js`: Service Worker für den Offline-Betrieb.
- `manifest.webmanifest` und Apple-Meta-Tags in `index.html`: Vollbild und Icon.
- `tools/make-icons.py`: erzeugt die Icons neu (braucht Python mit Pillow).

### Wie die Rätsel entstehen

1. Eine zufällige, vollständige, regelkonforme Lösung wird per Backtracking erzeugt.
2. In zufälliger Reihenfolge werden Felder entfernt. Ein Feld bleibt nur leer, wenn
   der **logische Löser** das Rätsel danach immer noch ohne Raten komplett lösen kann.
3. Zum Schluss prüft ein **unabhängiger Backtracking-Löser**, dass es genau eine Lösung gibt.

Der logische Löser kennt zwei Stufen:

- **Einfache Regeln:** zwei gleiche nebeneinander (`XX` → O daneben), Lücke (`X_X` → O dazwischen),
  Zählen (5 X in einer Zeile → Rest O).
- **Fortgeschritten:** Für eine Zeile oder Spalte werden alle noch möglichen Belegungen
  betrachtet (inklusive „keine zwei gleichen Zeilen“). Was in allen gleich ist, steht fest.

| Stufe | Nötige Logik | Vorgaben (ca.) |
|---|---|---|
| Leicht | nur einfache Regeln | 46 |
| Mittel | nur einfache Regeln, aber so wenige Vorgaben wie damit möglich (wie in der Zeitung) | 20–29, meist 25 |
| Schwer | braucht fortgeschrittene Schlüsse | 20–25 |

Ein Rätsel wird in Sekundenbruchteilen direkt auf dem iPhone erzeugt.

### Lokal starten und testen

```sh
npm start        # startet http://localhost:8080 (braucht Python 3)
npm test         # Tests für Löser und Generator (braucht Node.js 18+)
```

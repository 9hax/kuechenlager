# Küchenlager für Nextcloud

Ein gemeinsames Inventarmanagement für Lebensmittel in Nextcloud. Verwalte Lagerorte, Küchenbestände und Einkäufe, durchsuche Artikel und kategorisiere sie mit eigenen Tags.

Basiert auf der App [Lagerverwaltung von wenigdigital](https://github.com/wenigdigital/lager)

![Hauptansicht](docs/screenshots/01_main.png)

## Funktionen

- **Lagerstruktur:** Lagerorte mit optionalen Fotos → Regale/Schränke → Fächer
- **Artikel:** Titel, Hersteller, Menge, Notizen, Tags und optional EAN/Code oder Foto
- **Manuelle Pflege:** Artikel und Bestände ohne Kamera oder Scanner am PC verwalten
- **Tags:** Eigene gemeinsame Kategorien wie vegan oder vegetarisch anlegen
- **Lagerbewegungen:** Wareneingang und Entnahme buchen, mit Notiz und Benutzer
- **Historie:** vollständige Bewegungs-Historie mit Datum, Typ, Menge und Benutzer
- **Suche:** Titel, Hersteller, EAN, Notizen und Tags durchsuchen
- **Cam-Scanning:** Barcode (EAN-13, EAN-8) und QR-Codes live mit der Kamera scannen – mit Rückkamera-Voreinstellung und Kamerawahl bei mehreren Kameras
- **Foto-Scan:** Barcodes/QR-Codes auch aus einer Foto-Datei erkennen (robust, mit Entzerrung)
- **QR/Barcode erzeugen:** zu jedem Artikel per Knopfdruck als QR-Code oder EAN-Barcode
- **Mehrsprachig:** Deutsch und Englisch (weitere Sprachen willkommen)

## Screenshots

| Scan mit Kamera | Artikel bearbeiten (mit Foto) | Große Foto-Ansicht |
|---|---|---|
| ![Scan](docs/screenshots/02_scan.png) | ![Bearbeiten](docs/screenshots/03_edit.png) | ![Foto](docs/screenshots/04_photo.png) |

| Bewegungs-Historie | Suche |
|---|---|
| ![Historie](docs/screenshots/05_history.png) | ![Suche](docs/screenshots/06_search.png) |

## Installation

Die eigenständige App-ID lautet `kuechenlager`. Sie kann parallel zur ursprünglichen App `lager` installiert werden und verwendet eine vollständig getrennte Datenbasis. Es findet kein Datenaustausch statt.

Bis zur Veröffentlichung im Nextcloud App-Store den Ordner in `apps/` oder `apps-extra/` kopieren und im Admin-Bereich aktivieren.

Voraussetzung: Nextcloud 30–36, PHP 8.1–8.4. Für das Cam-Scanning wird ein moderner Browser mit Kamera-Zugriff empfohlen (Chrome/Edge, Firefox).

Alle Nutzer mit Zugriff auf die App können gemeinsame Lagerorte, Regale, Fächer und Artikel löschen.

## Datenschutz

Alle Daten (Struktur, Artikel, Bewegungen, Fotos) bleiben in deiner eigenen Nextcloud-Instanz. Es werden keine Daten an externe Server gesendet. Fotos werden komprimiert (max. 1024 px) lokal gespeichert.

## Lizenz

[AGPL-3.0-or-later](LICENSE)

## Veröffentlichung

Hinweise für eine signierte Store-Veröffentlichung stehen in [RELEASING.md](RELEASING.md).

## Spende

Gefällt dir die App? Du kannst mich gerne mit einer kleinen Spende unterstützen:
[PayPal: paypal.me/ToniWenig](https://paypal.me/ToniWenig)

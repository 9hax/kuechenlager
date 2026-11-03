# Ist-Zustand der Lagerverwaltung

## Zweck und Umfang

Die Nextcloud-App `lager` verwaltet Lagerorte, Schränke oder Regale, Fächer, Artikelbestände und deren Bewegungen. Die Oberfläche und die Artikelbegriffe sind auf eine allgemeine Lagerhaltung ausgelegt. Küchen- und Lebensmittelmerkmale wie Kategorien, Mindesthaltbarkeit oder Einkaufslisten sind im bestehenden Modell nicht abgebildet.

Diese Dokumentation beschreibt ausschließlich den untersuchten Stand. Der separate Änderungsplan für das Kücheninventar steht in [plan-kuecheninventar.md](./plan-kuecheninventar.md).

## Aufbau

- `appinfo/info.xml` definiert App-ID, Version 0.2.3, unterstützte Nextcloud-Versionen 30 bis 36 und PHP 8.1 bis 8.4.
- `appinfo/routes.php` registriert Seiten- und JSON-API-Routen.
- `lib/Controller/PageController.php` liefert die App-Seite aus und ermittelt, ob die angemeldete Person Nextcloud-Administrator ist.
- `lib/Controller/ApiController.php` nimmt API-Anfragen entgegen, übersetzt Servicefehler in HTTP-Antworten und prüft Uploads.
- `lib/Service/LagerService.php` enthält Geschäftslogik, Validierung, Suche, Bewegungsbuchungen, Bildverarbeitung und Löschabläufe.
- `lib/Db/` enthält Datenbankentitäten und Mapper für Lagerorte, Schränke, Fächer, Artikel und Bewegungen.
- `lib/Migration/` definiert das Schema und die spätere EAN-Spalte.
- `templates/main.php`, `js/lager.js` und `css/lager.css` bilden die einseitige Oberfläche. Die Scanner-Bibliotheken liegen lokal in `js/`.
- `l10n/` enthält deutsche und englische Übersetzungen.

Die App-Seite nutzt Nextclouds AppFramework. Das Frontend ruft dieselbe Nextcloud-Installation über die App-API auf; die dokumentierten Funktionen erfordern keinen externen Dienst.

## Datenmodell

Die Migrationen legen fünf Tabellen an:

| Tabelle | Zweck und wesentliche Felder |
|---|---|
| `lager_locations` | Lagerort mit Name, Beschreibung und Erstellungszeit |
| `lager_cabinets` | Schrank oder Regal, verknüpft mit einem Lagerort |
| `lager_slots` | Fach oder Fläche, verknüpft mit einem Schrank |
| `lager_stock` | Artikel innerhalb eines Fachs mit Bezeichnung, Beschreibung, Menge, EAN/Code sowie Erstellungs- und Änderungszeit |
| `lager_movements` | Bewegungsprotokoll mit Artikel- und Standort-Schnappschuss, Typ, Menge, Notiz, Benutzerkennung und Zeitpunkt |

Die Hierarchie lautet Lagerort → Schrank/Regal → Fach → Artikel. Der Bestand ist eine nichtnegative Ganzzahl. Artikelbezeichnungen sind innerhalb eines Fachs eindeutig; ein EAN-/Code-Wert ist global eindeutig. Fotos liegen nicht in einer Datenbankspalte, sondern als komprimierte JPEG-Dateien im Nextcloud-App-Datenbereich.

Bewegungen speichern Standort- und Artikelnamen als Schnappschuss. Das ermöglicht eine lesbare Historie, auch wenn Struktur- oder Artikelnamen später geändert werden. Beim Löschen werden zugehörige Kinder und Artikel in einer Datenbanktransaktion entfernt; ein Artikel kann nur bei Bestand null gelöscht werden.

## Bedienfunktionen

- Baumansicht für Lagerorte, Schränke und Fächer; die angezeigte Menge wird über darunterliegende Bestände aufsummiert.
- Artikel anlegen und bearbeiten, einschließlich Beschreibung, Menge und optionalem EAN/Code.
- Wareneingang und Entnahme mit Menge und optionaler Notiz buchen.
- Historie mit Benutzerkennung, Zeitpunkt, Richtung und Menge anzeigen.
- Artikel nach Name oder EAN/Code suchen. Die normale Suche beginnt ab zwei Zeichen und findet Artikelbezeichnungen sowie EAN-Werte.
- Codes mit der Kamera oder aus einer Bilddatei lesen, Codewerte manuell eingeben und QR-/EAN-Codes für Artikel anzeigen.
- Artikelbilder aufnehmen oder hochladen. Der Server skaliert auf maximal 1024 Pixel Kantenlänge und speichert JPEG.

## API und Ablauf

Die Routen in `appinfo/routes.php` decken Baumansicht, Fachbestand, Historie, Suche, CRUD für Lagerstruktur und Artikel, Bewegungen, Codesuche und Artikelbilder ab. Schreiboperationen laufen über den Service. Bestandsänderungen werden atomar ausgeführt und zusammen mit dem Bewegungsprotokoll gespeichert. Entnahmen scheitern, wenn der Bestand nicht ausreicht.

Die Frontend-Logik liegt im Wesentlichen in `js/lager.js`. Sie lädt den Baum, fordert Fachdetails an, zeigt Dialoge für Bearbeitung und Buchungen und steuert Suche, Historie, Kamera- und Bildscan. Die Clientbibliotheken für QR- und Barcode-Erkennung sind im Projekt enthalten.

## Zugriff und Datenschutz

Die App-Seite ist für angemeldete Nutzer zugänglich. Die meisten API-Routen markieren `NoAdminRequired`; das Löschen von Lagerorten, Schränken, Fächern und Artikeln ist dagegen auf Nextcloud-Administratoren beschränkt. Der Seitentemplate erhält dafür ein Admin-Merkmal. Andere Änderungen wie Erstellen, Bearbeiten und Buchen sind nicht auf Administratoren beschränkt.

Bewegungen erfassen die Nextcloud-Benutzerkennung. Das Modell weist Artikel oder Bestände keiner Person zu und enthält keine getrennten Benutzerinventare. Die bestehende Struktur ist damit gemeinsam innerhalb derselben App-Daten nutzbar, definiert aber keine feinere Rollen- oder Freigabeverwaltung.

## Migration und Dokumentationsquellen

`Version010000Date20260831000000` legt die fünf Tabellen an. `Version010100Date20260921000000` ergänzt den eindeutigen, optionalen EAN-Wert am Artikel. Weitere Tabellen oder Lebensmittel-Felder sind in den untersuchten Migrationen nicht vorhanden.

Die Funktionsübersicht und Installationshinweise stehen in `README.md`. `CHANGELOG.md` dokumentiert unter anderem die Administratorbeschränkung für Löschungen, CSRF-Schutz, Transaktionen und atomare Bewegungen. Die App-Metadaten spiegeln die wesentlichen Funktionen und Versionsanforderungen wider.

## Fortschritt und Entscheidungen

| Schritt | Status | Ergebnis und Begründung |
|---|---|---|
| Projektstruktur und vorhandene Produktdokumentation prüfen | Abgeschlossen | README, Changelog, App-Metadaten und Screenshots geben Zweck, Version und sichtbare Funktionen vor. |
| Seiten-, API-, Service- und Datenbankverhalten untersuchen | Abgeschlossen | Die Zuständigkeiten und Grenzen sind aus Routes, Controllern, Service, Mappern und Migrationen zusammengefasst. |
| Ist-Dokumentation erstellen | Abgeschlossen | Diese Datei dokumentiert den Ausgangspunkt, damit spätere Entscheidungen auf vorhandenen Strukturen und Einschränkungen beruhen. |
| Änderungsplanung für Kücheninventar erstellen | Abgeschlossen | Die Anforderungen sind in [plan-kuecheninventar.md](./plan-kuecheninventar.md) erfasst, geordnet, auf Vollständigkeit geprüft und mit offenen Entscheidungen versehen. Die Implementierung hat nicht begonnen. |
| Test-first-, Coverage- und CI-Plan ergänzen | Abgeschlossen | Der Plan legt fest, zuerst Tests für den Ist-Code aufzubauen und 100 Prozent Coverage für app-eigenen ausführbaren Code in GitHub-PR-CI zu erzwingen. Es wurden noch keine Tests oder App-Änderungen implementiert. |
| Testbasis und Coverage ausbauen | In Arbeit | Auf `test/initial-suite` bestehen 14 Frontendtests mit jsdom. Die PHP-Suite umfasst 47 Tests, davon 45 bestanden und zwei wegen des dokumentierten Originalfehlers rot. Coverage liegt bei 96,70 % Frontendzeilen und 56,55 % PHP-Zeilen. PHPUnit nutzt lokal verifiziertes Xdebug; Produktionscode blieb unverändert. Details und Lücken stehen in [testing.md](./testing.md). |

## Relevante Quelldateien

- [README.md](../README.md)
- [CHANGELOG.md](../CHANGELOG.md)
- [appinfo/info.xml](../appinfo/info.xml)
- [appinfo/routes.php](../appinfo/routes.php)
- [lib/Controller/ApiController.php](../lib/Controller/ApiController.php)
- [lib/Controller/PageController.php](../lib/Controller/PageController.php)
- [lib/Service/LagerService.php](../lib/Service/LagerService.php)
- [lib/Migration/Version010000Date20260831000000.php](../lib/Migration/Version010000Date20260831000000.php)
- [lib/Migration/Version010100Date20260921000000.php](../lib/Migration/Version010100Date20260921000000.php)
- [templates/main.php](../templates/main.php)
- [js/lager.js](../js/lager.js)

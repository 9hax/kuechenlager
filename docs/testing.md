# Tests

## Aktueller Testumfang

Die Frontend-Tests verwenden den in Node.js enthaltenen Test-Runner und jsdom. Sie prüfen Übersetzungen und Fallbacks, API-Request-Verträge sowie tatsächliche DOM-Abläufe: Root-Lagerort erstellen, Slot auswählen, Artikel als Text ohne Bild oder Scanner anlegen, Suchtreffer öffnen, manuellen Code suchen und Bewegungsverlauf darstellen.

Das bestehende Frontend läuft im isolierten VM-Kontext mit einem jsdom-Dokument. Damit wird die echte IIFE ausgeführt und vom Coverage-Lauf erfasst, ohne Produktionscode oder öffentliche Browser-APIs zu verändern.

PHPUnit-Tests prüfen Service-Regeln für Baum, CRUD, Transaktionen, Validierung, Suche, Historie und Code-Suche sowie Controller-Delegation, Fehlerantworten und Bild-Endpunkte.

Die GitHub-Actions-Datei `.github/workflows/tests.yml` führt Frontend- und PHP-Unit-Tests bei Pull Requests und Pushes auf `main` aus. Zusätzlich wird PHP-Quellcode mit PHP 8.1 bis 8.4 syntaktisch geprüft.

## Lokal ausführen

Voraussetzung ist Node.js 22 oder neuer:

```sh
npm test
```

PHP-Syntaxprüfung benötigt PHP 8.1 bis 8.4:

```sh
find appinfo lib templates -type f -name '*.php' -print0 | xargs -0 -n1 php -l
```

PHP-Unit-Tests:

```sh
composer install
composer test
```

PHP-Coverage wird mit Xdebug oder PCOV ermittelt. Auf GitHub Actions wird Xdebug aktiviert. Lokal benötigt der Coverage-Befehl eine dieser Erweiterungen:

```sh
npm run test:coverage
composer test:coverage
```

Auf Windows kann PHPUnit mit dem installierten Xdebug für PHP 8.4 ohne Änderung der `php.ini` ausgeführt werden:

```powershell
& 'C:\tools\php84\php.exe' -d 'zend_extension=C:\tools\php84\ext\php_xdebug-3.5.3-8.4-nts-vs17-x86_64.dll' -d xdebug.mode=coverage 'vendor\bin\phpunit' --coverage-text --path-coverage
```

## Aktueller Stand und Lücken

14 Frontend-Tests bestehen. Der aktuelle Coverage-Lauf für `js/lager.js` misst 96,70 Prozent Zeilen-, 75,45 Prozent Branch- und 45,83 Prozent Funktionsabdeckung. Noch nicht getestete Bereiche betreffen vor allem Kamera-/Bild-Decodierung und einzelne Scan-/Bilddialoge. 100 Prozent sind noch nicht erreicht und werden nicht durch bloße Ausführung ungenutzter Pfade erzwungen.

Die PHP-Suite umfasst 47 Tests und 208 Assertions. 45 Tests bestehen, zwei Bewegungsbuchungstests scheitern wegen eines Fehlers im bestehenden Produktionscode. Coverage gesamt: 56,55 Prozent Zeilen, 76,38 Prozent Branches, 51,58 Prozent Methoden und 14,77 Prozent Pfade. `ApiController` erreicht 99 Prozent Zeilen- und 95,65 Prozent Methoden-Coverage; `LagerService` 85,76 Prozent Zeilen- und 48,72 Prozent Methoden-Coverage. Tests decken unter anderem CRUD-Kaskaden und AppData-Bildspeicherung ab. Sie laufen mit gemocktem Datenzugriff, nicht innerhalb einer installierten Nextcloud-Instanz.

Für lokale PHP-Coverage wurde Xdebug 3.5.3 passend zu PHP 8.4 NTS VS17 x64 installiert. Der Download wurde gegen SHA-256 `a94d4fcfe4086a300b2decaf7c04e59f4981aa5e56992d48b55c5e49dfd9b9ee` verifiziert. Die Erweiterung liegt außerhalb des Repositorys; `php.ini` blieb unverändert. CI aktiviert Xdebug eigenständig.

Beim Testaufbau wurde ein bestehender Übersetzungsunterschied gefunden: `l10n/de.js` übersetzt „Choose file …“ mit „Datei wählen …“, während `l10n/de.json` und der eingebettete Fallback „Datei auswählen …“ verwenden. Außerdem fehlen in `l10n/de.js` Einträge für „Take photo“ und „Take a photo with the rear camera“, die in den anderen beiden Quellen vorhanden sind. Diese App-Texte wurden nicht verändert; die Korrektur gehört zur späteren Lokalisierungsarbeit.

## Beim Testen gefundene Bestandsprobleme

- **Bestätigter Bewegungsfehler:** Die Tests für Wareneingang und eine nicht ausreichende Entnahme scheitern in `LagerService::updateStockQuantityAtomically()`: `Class "OCA\Lager\Service\IQueryBuilder" not found`. `LagerService.php` importiert `OCP\DB\QueryBuilder\IQueryBuilder` nicht. Der Wareneingang wird zurückgerollt; bei der Entnahme tritt der Fehler vor der erwarteten Mengenvalidierung auf. Produktionscode wurde nicht geändert.
- **Root-Lagerort-404 nicht reproduziert:** Frontend-Test, Routentest und Controller-Test bestätigen den API-Pfad `POST /api/location`, nicht jedoch die Nextcloud-Routenauflösung auf einer installierten Instanz. Für den berichteten `NetworkError Resource Not Found` bleiben der tatsächlich angefragte URL-Pfad aus dem Browser-Netzwerk-Tab und der passende Nextcloud-Logeintrag erforderlich.
- **Möglicherweise ungenutzte öffentliche Methoden:** `LagerService::getLocation()` und `LagerService::getCabinet()` haben im Repository keine Aufrufer. Sie sind dokumentiert, aber nicht entfernt oder geändert.

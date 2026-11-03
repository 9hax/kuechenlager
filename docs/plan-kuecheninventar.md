# Plan: Kücheninventar für Nextcloud

## Ziel und Abgrenzung

Die bestehende Lagerverwaltung soll als eigenständig installierbare, familiengeeignete App für gemeinsames Kücheninventar weiterentwickelt werden. Alte und neue App müssen gleichzeitig installiert und unabhängig betrieben werden können. Ein Datenimport, eine Synchronisation oder sonstiger Datenaustausch mit der alten App ist nicht vorgesehen.

Dieses Dokument plant Änderungen, setzt sie aber nicht um. Die ursprüngliche App bleibt bis zu einer gesonderten Freigabe unverändert.

## Anforderungen und vorgesehene Änderungen

| ID | Anforderung | Geplante Änderung |
|---|---|---|
| A1 | Koexistenz mit der alten App und getrennte Datenbasis, ohne Datenaustausch | Neue Nextcloud-App-ID und eigene Tabellen, Routen, Namespace-/Klassenkennungen, App-Datenablage, Navigation und Metadaten vorsehen. Keine Migration von Lagerdaten und keine Kopplung an alte Tabellen oder Dateien. |
| A2 | Familie kann Einträge im Ortsbaum und einzelne Artikel löschen | Administratorbeschränkung für diese Löschvorgänge entfernen. Berechtigungen serverseitig an allen betroffenen API-Aktionen durchsetzen und Oberfläche entsprechend anpassen. Kaskadierende Löschungen und Bestandsregeln müssen konsistent und transaktional bleiben. |
| A3 | Artikel auch ohne Scan oder Foto als Text am PC pflegen | Vollständiges manuelles Anlegen und Bearbeiten über die Weboberfläche ermöglichen. Barcode und Foto bleiben optionale Hilfen, keine Pflichtfelder. |
| A4 | Donate-Schaltfläche als nicht schwebender Footer mit zusätzlicher Information | Schwebenden Spendenknopf durch einen in den Seitenfluss integrierten Footer ersetzen. Dort Spendenlink und geprüfte Herkunfts-/Softwareattribution unterbringen. |
| A5 | App-Store-Metadaten und Screenshot korrigieren | Name, Zusammenfassung, Beschreibung, Rechte und Funktionen an die neue App anpassen. Screenshot-Referenzen mit den tatsächlich veröffentlichten Bilddateien und URLs abgleichen und prüfen. |
| A6 | Lagerorte sollen Fotos unterstützen | Bild-Upload, Speicherung, Anzeige und Löschung für Lagerorte ergänzen. Speicher- und Validierungsverhalten am bestehenden Artikelbild-Muster orientieren, dabei Eigentümerschaft und Bereinigung bei Löschungen berücksichtigen. |
| A7 | Suche soll alle Artikel-Felder durchsuchen | Suchabfrage und Oberfläche auf sämtliche durchsuchbaren Artikelfelder erweitern, mindestens Titel, Hersteller, EAN, Notizen und Tags. Feldliste bei späteren zusätzlichen Artikelmerkmalen pflegbar halten. |
| A8 | Artikel mindestens mit Titel, Hersteller, Menge, EAN, Bild, Notizen und Tags | Artikeldatenmodell, Migrationen, API, Formulare, Listen und Detailansichten um die fehlenden Felder ergänzen. Titel, Hersteller, Menge, EAN, Bild, Notizen und Tags müssen manuell bearbeitbar sein; Bild und EAN dürfen leer bleiben. |
| A9 | Benutzerdefinierte Tags, etwa vegan oder vegetarisch | Tags als gemeinschaftlich verwaltete Werte anlegen, bearbeiten und löschen können und mehreren Artikeln zuordnen. Beispielwerte nicht fest in den Code einbauen. |
| A10 | Localization bleibt vollständig nutzbar | Neue und geänderte sichtbare Texte über die vorhandene Nextcloud-i10n-Lösung führen und Übersetzungsdateien aktualisieren. Auch Footer, Formulare, Validierung, Fehlermeldungen, Tags und Store-Texte auf unübersetzte UI-Texte prüfen. |

## Empfohlene Reihenfolge

Die Schritte sind nach technischen Abhängigkeiten geordnet. A10 ist eine Querschnittsanforderung und gilt für jeden Schritt. Vor allen Produktänderungen wird die Testbasis gegen den vorhandenen Code aufgebaut.

| Schritt | Inhalt | Abhängigkeiten und Begründung | Ergebnis |
|---|---|---|---|
| 1. Testbasis für den Ist-Code aufbauen | Geeignete PHP- und JavaScript-Testwerkzeuge anhand der vorhandenen Laufzeit und Abhängigkeiten festlegen. Unit-, Integrations- und Browser-nahe Tests für vorhandene Geschäftsregeln, API-Verhalten, Datenzugriff, Oberflächenlogik, Übersetzungen und Metadaten schreiben. CI-Grundworkflow ergänzen; Coverage-Bericht folgt, wenn ausführbarer Code gemessen wird. | Muss vor der ersten Produktänderung erfolgen. Charakterisierungstests sichern vorhandene Verträge, während Coverage-Lücken und testbedingte Refactorings sichtbar werden. | Lokal ausführbare Tests gegen den aktuellen Stand; Pull-Request-Workflow läuft. |
| 2. Coverage-Lücken schließen und Baseline festhalten | Nicht getestete App-eigene Laufzeitpfade mit Tests abdecken. Testbarkeit nötigenfalls gezielt verbessern, ohne fachliches Verhalten zu ändern. Coverage für unveränderten Ausgangscode erzeugen und als Baseline festhalten. | Baut auf Schritt 1 auf. Verhindert, dass eine neue 100-Prozent-Anforderung nur für hinzugefügte Dateien gilt oder bestehende Lücken verdeckt. | Vollständige, reproduzierbare Coverage des vereinbarten App-Codeumfangs auf dem Ist-Stand. |
| 3. Test-first-Regel für Produktarbeit anwenden | Für jede folgende Anforderung zuerst Regression- und Akzeptanztests hinzufügen, die den Sollvertrag ausdrücken; neue Verhaltenstests dürfen bis zur Implementierung erwartungsgemäß fehlschlagen. Danach klein implementieren, Tests bestehen lassen und Coverage erneut prüfen. | Kern des TDD-Ablaufs; Tests aus Schritt 1 und 2 dienen zugleich als Regression für bestehendes Verhalten. | Jede Produktänderung wird durch vorangehende Tests abgesichert und bleibt regressionsgeprüft. |
| 4. App-Identität und Isolation festlegen | Eindeutige App-ID, Namespace, Route-Namen, Tabellennamen, App-Datenpfad, Navigation, Icons und Paket-/Installationskennung bestimmen. Veröffentlichungsziel und Koexistenz prüfen. | Erst nach vorhandener Testabsicherung; Voraussetzung für alle weiteren Produktänderungen. Ein nur umbenanntes UI oder eine neue App-ID bei gleichbleibenden Tabellen/App-Daten wäre keine sichere Trennung. | Alte und neue App können parallel installiert werden, ohne dieselben Datenobjekte zu verwenden. |
| 5. Kücheninventar-Datenmodell entwerfen | Artikel um Hersteller und Notizen ergänzen; vorhandene Beschreibung gegebenenfalls als Notizen weiterverwenden oder eine verlustfreie Ablösung festlegen. Benutzerdefinierte Tags und Artikel-Tag-Zuordnung modellieren. Bild- und optionale EAN-Felder sowie Lagerortbilder berücksichtigen. | Datenbank, API und UI hängen von stabilen Feldnamen und Beziehungen ab. Tests für Migrationen, Beziehungen und Löschverhalten vor dem Schema-Code ergänzen. Bestehende Daten gehören zur alten App und werden nicht importiert. | Abgestimmtes Schema samt getesteten Migrationen und Löschverhalten. |
| 6. Gemeinsame Rechte und Löschregeln umsetzen | Löschaktionen für freigegebene Nutzer öffnen, Berechtigungsbedingungen auf Server und UI abstimmen, Kaskaden und Bild-/Tag-Bereinigung transaktional behandeln. | Die Rechte betreffen Datenmodell und API-Änderungen. Vor Implementierung Tests für erlaubte und verweigerte API-Aufrufe, Kaskaden und Rollbacks schreiben. Serverseitige Prüfung ist maßgeblich; UI allein reicht nicht. | Familienmitglieder können die vorgesehenen Einträge löschen, ohne verwaiste Daten zu hinterlassen. |
| 7. Manuelle Artikel- und Standortpflege vervollständigen | Textbasierte Formulare für Artikel und Tags bauen, optionale EAN-/Bildfelder anbieten, Lagerortbild-Upload und -Anzeige ergänzen. Bestandsbuchungen für PC-Bedienung leicht erreichbar machen. | Nutzt das Schema aus Schritt 5 und die Rechte aus Schritt 6. Vor Implementierung Formular-, API-, Upload- und Bildbereinigungstests schreiben. Scan bleibt ein optionaler Bedienweg. | Vollständige Pflege ohne Kamera oder Scanner. |
| 8. Suche über Artikelfelder erweitern | Suchmapper, Service, API und Ergebnisdarstellung auf Titel, Hersteller, Notizen, EAN und verknüpfte Tags erweitern. Eingabe und Ergebnis müssen bei leeren optionalen Werten robust sein. | Benötigt Artikel- und Tag-Modell sowie finale Feldnamen. Vor Implementierung gezielte Treffer-/Nichttreffer-, Grenzfall- und Integrationstests ergänzen. | Einheitliche Suche über alle Artikelattribute. |
| 9. Oberfläche und Footer anpassen | Floating-Donate entfernen, Footer in den Seitenfluss einfügen, Herkunftshinweis und Link ergänzen. Küchenbegriffe, Standort-/Artikelbilder und Tags in Navigation, Baum und Detailansicht integrieren. | Herkunft muss vor Veröffentlichung verifiziert sein; UI basiert auf den vorherigen Domänenänderungen. Interaktions- und Übersetzungstests vor UI-Code ergänzen. | Familiengeeignete, konsistente Kücheninventar-Oberfläche. |
| 10. Übersetzungen vervollständigen | Alle neu hinzugefügten oder geänderten UI-Texte in bestehende Übersetzungsdateien aufnehmen und statische sichtbare Strings aus dem App-Code entfernen. | Begleitend in allen Schritten, zum Abschluss automatisierte Prüfungen auf fehlende Schlüssel und nicht lokalisierte UI-Texte ausführen. | Übersetzbare deutsche und englische Oberfläche ohne neue fest codierte UI-Texte. |
| 11. App-Store-Informationen und Veröffentlichung prüfen | Neue Metadaten und Screenshots eintragen, URLs gegen veröffentlichte Dateien validieren, Herkunft korrekt benennen, Versions- und Installationshinweise für Koexistenz aktualisieren. | Erst nach feststehender App-Identität, Funktionen und bestätigter Attribution. Metadaten- und Asset-Referenzen in CI validieren. | Akkurate Store-Darstellung und nachvollziehbare Installation. |
| 12. Abnahme und Regression | Migrationen, Berechtigungen, CRUD, Suchfelder, Bilder, Tags, Übersetzungen, Parallelinstallation und Metadaten testen; gesamten CI-Workflow und Coverage-Gate ausführen. | Abschluss nach allen Implementierungsschritten. | Geprüfte Erfüllung der Anforderungen ohne Beeinträchtigung der alten App. |

## Test-Driven-Development und Coverage

Verbindlicher Arbeitszyklus für die Implementierung:

1. Sollverhalten aus Anforderung und Abnahmekriterium als fokussierten Test formulieren.
2. Test gegen den aktuellen Code ausführen und erwartetes Fehlschlagen bestätigen, wenn es neues Verhalten beschreibt.
3. Kleinste passende Implementierung ergänzen.
4. Betroffene Tests und anschließend die vollständige Suite ausführen.
5. Coverage prüfen und alle App-eigenen Codepfade ergänzen, bevor die Änderung abgeschlossen ist.

Die Testbasis wird zuerst für den bestehenden Code aufgebaut. Bestehendes Verhalten, das erhalten bleiben soll, wird mit Charakterisierungstests festgehalten. Veraltetes Verhalten, das Anforderungen widerspricht, wird nicht als dauerhaft gewünschter Vertrag zementiert; die zugehörigen Tests werden mit der vorab dokumentierten Anforderung ersetzt.

**Coverage-Ziel:** 100 Prozent Zeilen-, Funktions- und Branch-Coverage für den definierten, ausführbaren, app-eigenen Produktionscode. CI soll bei Unterschreitung fehlschlagen. Drittanbieter-/generierte Scanner-Bibliotheken werden nicht als eigener App-Code gewertet; statische Ressourcen wie CSS, Templates, Übersetzungsdateien und XML-Metadaten erhalten stattdessen automatisierte Struktur-, Schlüssel-, Referenz- und Renderingprüfungen. Keine nicht getesteten app-eigenen Laufzeitdateien dürfen stillschweigend aus dem Coverage-Umfang ausgeschlossen werden. Eine Abweichung vom 100-Prozent-Ziel erfordert eine dokumentierte, begründete Ausnahme und Freigabe.

**Pull-Request-CI:** GitHub Actions soll bei Pull Requests und Änderungen am Hauptbranch die passenden PHP- und JavaScript-Tests, statische Prüfungen, Metadaten-/Übersetzungsvalidierung und Coverage-Gates ausführen. Abhängigkeiten und unterstützte PHP-Versionen sind an den App-Metadaten auszurichten. Ein Nextcloud-Integrationstest soll Migrationen, API-Rechte und Koexistenz prüfen; falls die CI keine echte Nextcloud-Instanz bereitstellen kann, muss ein lokaler/containerbasierter reproduzierbarer Testweg separat dokumentiert werden. Der PR darf nicht als testbereit gelten, solange Checks nicht erfolgreich sind.

Die konkrete Testwerkzeug-Auswahl erfolgt in Schritt 1 nach Prüfung installierbarer Nextcloud-Testbibliotheken, PHP-Laufzeit und verfügbarer JavaScript-Laufzeit. Für die Coverage-Zusage sind beide Laufzeitbereiche zu messen; ungemessener Frontend-Code darf nicht durch reine PHP-Coverage als abgedeckt gelten.

## Abnahmekriterien

- Alte und neue App lassen sich gleichzeitig installieren und aktivieren. Jede App zeigt und ändert ausschließlich ihre eigene Datenbasis. Es gibt keine automatische Übernahme von Bestandsdaten.
- Eine normale berechtigte Nextcloud-Nutzerin oder ein normaler berechtigter Nutzer kann Ortsbaum-Einträge und einzelne Artikel löschen. Das Verhalten ist im Frontend und in direkten API-Aufrufen gleich.
- Artikel können ohne Kamera, Barcode und Bild per Text angelegt und gepflegt werden; Menge kann auch am PC geändert beziehungsweise über die vorhandenen Buchungsabläufe aktualisiert werden.
- Artikel können Titel, Hersteller, Menge, optionale EAN, optionales Bild, Notizen und mehrere benutzerdefinierte Tags haben.
- Tags lassen sich durch Benutzer anlegen und für Lebensmittelmerkmale wie vegan oder vegetarisch verwenden.
- Artikelbilder und Lagerortbilder können hochgeladen, angezeigt und beim Löschen der zugehörigen Datensätze bereinigt werden.
- Die Suche liefert Treffer über Titel, Hersteller, EAN, Notizen und Tag-Namen.
- Jede sichtbare neue oder geänderte App-Beschriftung wird über die i10n-Lösung übersetzt.
- Footer ist nicht schwebend und zeigt nur verifizierte Hinweise. App-Store-Screenshots verweisen auf tatsächlich erreichbare, zum Produkt passende Dateien.
- Bestehende App und Daten bleiben durch die Änderungen unangetastet.

## Planungsprüfung

Die Anforderungen A1 bis A10 sind jeweils einem Planungsschritt und überprüfbaren Abnahmekriterien zugeordnet. Die Reihenfolge respektiert die Abhängigkeiten: zuerst Tests und Coverage für den Ist-Code, dann Isolation vor Schema, Schema vor Pflege und Suche, abgeschlossene Produktidentität vor Store-Metadaten. TDD legt Tests vor die Implementierung jedes Verhaltens. Rechte werden nicht nur in der Oberfläche geplant, sondern ausdrücklich für API-Aktionen. Bilder und Tags berücksichtigen Speicherung beziehungsweise Beziehungen und Löschbereinigung. Übersetzung ist als durchgehende Vorgabe und als Abschlussprüfung aufgenommen. Coverage wird für Backend und Frontend getrennt gemessen und in CI durchgesetzt.

Die 100-Prozent-Zusage bezieht sich auf den messbaren app-eigenen Laufzeitcode. Sie ist kein Ersatz für Integrations- und UI-Prüfungen; Metadaten und andere statische Dateien werden mit passenden Prüfungen abgedeckt. Die aktuelle Repository-Aufnahme zeigt noch keine Testkonfiguration, Testdateien oder GitHub-Workflow-Dateien. Die Testinfrastruktur muss daher im ersten Schritt neu eingerichtet werden, statt vorhandene CI vorauszusetzen.

Vor der Umsetzung sind folgende Punkte zu klären oder anhand des Repository-Verlaufs zu verifizieren:

1. **Haushaltszugriff:** Geplant ist, dass alle Nextcloud-Nutzer mit Zugriff auf diese App dasselbe Kücheninventar sehen und bearbeiten. Soll die App-Teilnahme auf ausgewählte Familienkonten begrenzt werden, braucht es eine zusätzliche Mitgliedschafts- oder Gruppenregel.
2. **Herkunftsangabe:** Die konkrete ursprüngliche Software und gewünschte Formulierung müssen anhand Lizenz, Projektgeschichte oder einer Angabe des Maintainers geprüft werden. Keine Herkunft wird im Footer behauptet, bevor sie belegt ist.
3. **Herstellerfeld:** Für die erste Version wird ein frei eingebbares Textfeld angenommen. Ein Hersteller-Stammdatenverzeichnis oder eine Produktdatenbank ist nicht gefordert.
4. **Menge:** Der Bestand bleibt vorläufig eine nichtnegative Ganzzahl wie im aktuellen System. Einheiten oder Dezimalmengen wurden nicht verlangt und sollten vor einer Abweichung bestätigt werden.
5. **Tags:** Vorgesehen sind gemeinsame, frei verwaltbare Tags und Mehrfachzuordnung. Eine feste Liste oder persönliche Tags sind nicht angefordert.
6. **Screenshots:** Der vorhandene Veröffentlichungsort und die finalen Küchenansichten müssen vor Korrektur der Store-URLs bestimmt werden.

Diese Punkte blockieren die Dokumentation des Plans nicht, sind aber vor der jeweiligen Implementierung beziehungsweise Veröffentlichung zu bestätigen. Größere Produktentscheidungen wie Haushaltszugriff oder Bestandseinheiten sollten nicht stillschweigend angenommen werden.

## Fortschritt

| Schritt | Status | Ergebnis |
|---|---|---|
| Ist-System dokumentieren | Abgeschlossen | Siehe [Ist-Zustand](./ist-zustand.md). |
| Anforderungen erfassen und auf Architektur abbilden | Abgeschlossen | Zehn Anforderungen sind mit den betroffenen Daten-, API-, UI-, Rechte- und Metadatenbereichen verknüpft. |
| Umsetzungsschritte ordnen | Abgeschlossen | Zwölf Schritte berücksichtigen Testaufbau, Abhängigkeiten, Coverage und Übersetzungsanforderungen. |
| Planung gegen Anforderungen und Risiken prüfen | Abgeschlossen | Abdeckung, Abnahmekriterien und noch zu bestätigende Annahmen sind dokumentiert. |
| TDD- und Coverage-Ansatz ergänzen | Abgeschlossen | Test-first-Ablauf, Ausgangsbaseline, 100-Prozent-Coverage-Ziel und GitHub-PR-CI sind in den Plan aufgenommen. |
| Testbasis für den Ist-Code aufbauen | In Arbeit | 14 Frontendtests mit jsdom und 47 PHP-Tests prüfen vorhandene Abläufe. Der Root-Lagerort-404 wird im Frontendvertrag nicht reproduziert. Zwei PHP-Bewegungstests bestätigen den IQueryBuilder-Fehler im Originalcode. Keine Produktionsdatei wurde geändert. |
| Coverage-Baseline und PHP-Verhaltenstests | In Arbeit | JavaScript: 96,70 % Zeilen, 75,45 % Branches, 45,83 % Funktionen. PHP: 56,55 % Zeilen, 76,38 % Branches, 51,58 % Methoden, 14,77 % Pfade. Lokale Xdebug-Coverage ist eingerichtet; Kamera-/Bildverarbeitung und Servicepfade bleiben offen. |
| Implementierung | Nicht begonnen | Bleibt bis zu einer ausdrücklichen Freigabe aus. |

# Europa Wanderkarte – Abschlussprojekt Geoinformatik

## Ziel

Dieses Projekt verfolgt das Ziel, eine interaktive Webmap zur Darstellung europäischer Wanderrouten, Schutzhütten und Wildcamping-Regelungen zu entwickeln. Die Anwendung führt mehrere räumliche Datensätze in einer gemeinsamen webbasierten Umgebung zusammen und macht sie für eine kartenbasierte Exploration nutzbar.

Im Mittelpunkt stehen drei thematische Ebenen: ausgewählte Wanderrouten in Europa, Standorte von Schutzhütten sowie Wildcamping-Regelungen auf Staatenebene und auf Admin-1-Ebene für ausgewählte Länder. Das Projekt ist als planungsorientierter Webmap-Prototyp konzipiert und demonstriert die Integration, Aufbereitung und Visualisierung heterogener Geodaten im Kontext eines Geoinformatik-Projekts.

## Installation

Für die Ausführung wird kein separates Softwarepaket installiert. Benötigt wird lediglich ein lokaler Webserver, da die Anwendung GeoJSON-Dateien und weitere Ressourcen über `fetch()` lädt. Ein direktes Öffnen der `index.html` per Doppelklick ist daher nicht zuverlässig.

Empfohlene Projektstruktur:

`abschlussprojekt\\\_webmap/`

mit folgenden zentralen Bestandteilen:

* `README.md`
* `Kurzbeschreibung.pdf`
* `screenshots/`
* `webmap/`

Wichtige Dateien für die Ausführung befinden sich im Ordner `webmap/`.

Voraussetzungen:

* aktueller Webbrowser
* lokaler Webserver, z. B. über Python, VS Code Live Server oder Node-basierte Server

## Start

Zur lokalen Ausführung sollte im Projektordner `abschlussprojekt\\\_webmap/` ein lokaler Webserver gestartet werden.

Beispiel mit Python:

`python -m http.server 8000`

Falls unter Windows der Befehl `python` nicht erkannt wird, kann alternativ verwendet werden:

`py -m http.server 8000`

Anschließend kann die Anwendung im Browser über folgende Adresse geöffnet werden:

`http://localhost:8000/webmap/`

Von dort aus ist die Webmap direkt erreichbar. Die Dokumentationsseiten für Quellen und Workflow sind über die Links in der Sidebar aufrufbar.

## Datenquellen

Die Webmap basiert auf mehreren Ausgangsdaten und projektinternen Arbeitsdateien.

Die Ausgangsdaten der europaweiten Staatenpolygone stammen aus:
Esri Hub – World Countries (Generalized)
[https://hub.arcgis.com/datasets/esri::world-countries-generalized/explore?location=-0.000264%2C0.000000%2C1.00](https://hub.arcgis.com/datasets/esri::world-countries-generalized/explore?location=-0.000264%25252C0.000000%25252C1.00)

Die Daten zu den Schutzhütten wurden aus folgender Quelle übernommen und bereinigt:
campwild.org
[https://campwild.org/#home](https://campwild.org/#home)

Die Daten zu den Wanderrouten wurden aus folgender Quelle übernommen:
Waymarked Trails – Hiking
[https://hiking.waymarkedtrails.org/#?map=10.0/50.7364/7.3312](https://hiking.waymarkedtrails.org/#?map=10.0/50.7364/7.3312)

Zusätzlich wurden projektinterne Dateien verwendet:

* `Legalität.xlsx`
* `Legalitaet.geojson`
* `BEL\\\_admin1.geojson`
* `POL\\\_admin1.geojson`
* `TUR\\\_admin1.json`

Für die zusätzliche Admin-1-Ebene wurden außerdem externe Geometriedaten verwendet:

* Deutschland – Bundesländer: deutschlandGeoJSON [https://github.com/isellsoap/deutschlandGeoJSON/blob/main/2\_bundeslaender/4\_niedrig.geo.json](https://github.com/isellsoap/deutschlandGeoJSON/blob/main/2_bundeslaender/4_niedrig.geo.json)
* Österreich – Bundesländer: GeoJSON-TopoJSON-Austria [https://github.com/ginseng666/GeoJSON-TopoJSON-Austria](https://github.com/ginseng666/GeoJSON-TopoJSON-Austria)

Für die rechtliche Einordnung der Wildcamping-Regelungen wurden ergänzend folgende Referenzen verwendet:

* [https://www.bivakzone.be/](https://www.bivakzone.be/)
* [https://natuurenbos.be/activiteiten/bivakzone](https://natuurenbos.be/activiteiten/bivakzone)
* [https://zanocujwlesie.lasy.gov.pl/](https://zanocujwlesie.lasy.gov.pl/)
* [https://www.lasy.gov.pl/pl/turystyka/program-zanocuj-w-lesie](https://www.lasy.gov.pl/pl/turystyka/program-zanocuj-w-lesie)
* [https://www.tarimorman.gov.tr/DKMP/Belgeler/KORUNAN%20ALANLAR%20%C3%9CCRET%20TAR%C4%B0FES%C4%B0/2026/Ek-21%20Korunan%20Alanlar%20Ucret%20Tarifesi%20Uygulama%20Usul%20ve%20Esaslari-2026.pdf](https://www.tarimorman.gov.tr/DKMP/Belgeler/KORUNAN%252520ALANLAR%252520%2525C3%25259CCRET%252520TAR%2525C4%2525B0FES%2525C4%2525B0/2026/Ek-21%252520Korunan%252520Alanlar%252520Ucret%252520Tarifesi%252520Uygulama%252520Usul%252520ve%252520Esaslari-2026.pdf)
* [https://trekkingtrails.de/jedermannsrecht/](https://trekkingtrails.de/jedermannsrecht/)
* [https://www.zasada.cc/wildcampen-info](https://www.zasada.cc/wildcampen-info)

Aus den Ausgangsdaten wurden im Projekt unter anderem folgende Arbeitsdateien erzeugt:

* `routes\\\_top50\\\_clean.geojson`
* `shelters.geojson`
* `countries\\\_wildcamp.geojson`
* `wildcamping\\\_admin1\\\_de\\\_be\\\_pl\\\_tr\\\_at.geojson`

Eine ausführlichere und strukturierte Dokumentation der Quellen befindet sich in `webmap/quellen.html`. Der methodische Arbeitsablauf ist in `webmap/workflow.html` dokumentiert.

## Einschränkungen

Die Webmap ist als planungsorientierter Prototyp zu verstehen. Sie dient der räumlichen Übersicht und der exemplarischen Zusammenführung mehrerer Geodatensätze, stellt jedoch keine rechtsverbindliche Auskunft dar.

Die Datenbasis ist heterogen und wurde aus unterschiedlichen Quellen zusammengeführt, bereinigt und harmonisiert. Daraus ergeben sich Unterschiede in Vollständigkeit, räumlicher Detailtiefe und Aktualität.

Für Deutschland und Österreich wurden Wildcamping-Regelungen auf Admin-1-Ebene auf Basis der projektinternen Tabelle `Legalität.xlsx` zugeordnet. Für Belgien, Polen und die Türkei erfolgte eine konservative Übertragung landesweiter Regelungen auf die jeweilige Admin-1-Ebene. Diese Zuordnung ist als vereinfachte Modellierung zu verstehen und ersetzt keine vertiefte rechtliche Prüfung auf regionaler oder lokaler Ebene.

Darüber hinaus können regionale Ausnahmen, Schutzgebietsregelungen, kommunale Bestimmungen und kurzfristige Änderungen auftreten. Vor einer konkreten Nutzung für Tourenplanung oder Übernachtung sollten daher stets aktuelle offizielle Quellen und lokale Regelungen geprüft werden.

Auch die technische Umsetzung ist als Prototyp ausgelegt. Die Anwendung wurde für die lokale Ausführung über einen kleinen Webserver vorbereitet und ist nicht als produktionsreife Webplattform konzipiert.


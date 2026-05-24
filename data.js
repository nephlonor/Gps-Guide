/* eslint-disable */
// Elf versteckte architektonische Juwelen Basels, projiziert auf die elf
// Häuser des Weilers Biel im Lötschental.
//
// Koordinaten: vor Ort im Edit-Modus platziert (Zentroid ~46.41750 N,
// 7.78467 E). Foto-URLs zeigen auf Wikimedia Commons Special:FilePath —
// nicht aufgelöste Dateinamen fallen automatisch auf die SVG-Illustration
// zurück.

function wmFilePath(filename) {
  return "https://commons.wikimedia.org/wiki/Special:FilePath/" +
    encodeURIComponent(filename) + "?width=900";
}
// Mehrere wahrscheinliche Dateinamen pro Gebäude — beim Laden wird die
// erste auflösbare URL angezeigt, ansonsten fällt die SVG-Illustration ein.
function photos(...names) { return names.map(wmFilePath); }

window.BUILDINGS = [
  {
    id: 1,
    name: "Wasserturm Bruderholz",
    architect: "Hans Bernoulli",
    year: 1925,
    style: "Modernism",
    address: "Bruderholzallee, Basel",
    lat: 46.417715,
    lon: 7.784512,
    illustration: "watertower",
    palette: ["#d9c9a8", "#8a6f44", "#3a2e22"],
    photo: photos(
      "Bruderholz Wasserturm.jpg",
      "Wasserturm Bruderholz Basel.jpg",
      "Basel Bruderholz Wasserturm.JPG",
      "Wasserturm Bruderholz.jpg"
    ),
    text:
      "Ein zarter sechseckiger Wasserturm, versteckt auf dem begrünten " +
      "Bruderholz-Plateau. Hans Bernoulli — eher bekannt als Theoretiker " +
      "der Gartenstadt — verleiht dem Zweckbau eine klassische Anmutung: " +
      "ein schlanker rustifizierter Sockel, ein gerillter Schaft aus " +
      "Sichtbeton und eine Kupferlaterne, die zu Grünspan verwittert ist. " +
      "Der Turm vermittelt still zwischen bürgerlichem Monument und " +
      "Ingenieurbau — eine frühe Schweizer Lesart der Neuen Sachlichkeit " +
      "in sanften Sandsteintönen.",
    interesting:
      "Schau ganz oben aufs Laternendach: in der grün gewordenen " +
      "Kupferhaube sind noch die ursprünglichen, schmiedeeisernen " +
      "Blitzableiter-Spitzen zu erkennen — Bernoullis Hommage an die " +
      "ländliche Schmiedearbeit mitten im Stadtgebiet."
  },
  {
    id: 2,
    name: "Antoniuskirche",
    architect: "Karl Moser",
    year: 1927,
    style: "Sacred",
    address: "Kannenfeldstrasse 35",
    lat: 46.417783,
    lon: 7.784615,
    illustration: "antonius",
    palette: ["#9c9388", "#5a5247", "#2f2a23"],
    photo: photos(
      "Basel Antoniuskirche.jpg",
      "Antoniuskirche Basel.jpg",
      "Basel - Antoniuskirche.jpg",
      "Antoniuskirche (Basel).jpg",
      "St. Anton Basel.jpg"
    ),
    text:
      "Die erste vollständig in Stahlbeton errichtete Kirche der Schweiz " +
      "und eines der entscheidenden Bauwerke der europäischen modernen " +
      "Sakralarchitektur. Moser liess den Beton bretterrau und " +
      "pigmentgrau und öffnete eine grosse Fensterrose mit der " +
      "Glasmalerei Otto Staigers in die Westfassade. Von aussen wirkt " +
      "der Bau wie eine stille Basilika; im Inneren erhebt sich das " +
      "Schiff wie ein steinerner Wald — kompromisslos roh.",
    interesting:
      "Tritt nahe an die Fassade und streiche mit der Hand über den Beton " +
      "— die Bretterstruktur der originalen Holzschalung von 1927 ist " +
      "absichtlich nicht verputzt worden. Jede Maserung ist eine " +
      "verewigte Schweizer Föhre."
  },
  {
    id: 3,
    name: "Lukaskirche",
    architect: "Karl Egender",
    year: 1936,
    style: "Sacred",
    address: "Luzernerring 89",
    lat: 46.417676,
    lon: 7.784910,
    illustration: "lukas",
    palette: ["#ddd2bb", "#7c6b51", "#352c23"],
    photo: photos(
      "Basel Lukaskirche.jpg",
      "Lukaskirche Basel.jpg",
      "Basel - Lukaskirche.jpg",
      "Lukaskirche (Basel).jpg"
    ),
    text:
      "Egender bringt Bauhaus-Zurückhaltung in die protestantische " +
      "Pfarrkirche. Ein freistehender Campanile setzt sich vom " +
      "prismatischen Kirchenraum ab; die Eckfenster lassen Tageslicht " +
      "über das weiss verputzte Innere fluten. In den Krisenjahren " +
      "erbaut, wirkt die Kirche fast wie ein Schiff — lang, niedrig, " +
      "auf das westliche Licht gerichtet.",
    interesting:
      "Der freistehende Glockenturm berührt das Kirchenschiff bewusst " +
      "nicht — zwischen beiden bleibt ein schmaler Schlitz von rund " +
      "40 cm. Egender wollte damit beweisen, dass eine Kirche auch ohne " +
      "den traditionellen Glockenturm-Anschluss noch eine Kirche ist."
  },
  {
    id: 4,
    name: "Volta-Schulhaus",
    architect: "Miller & Maranta",
    year: 2000,
    style: "Contemporary",
    address: "Wasgenring 100",
    lat: 46.417781,
    lon: 7.785107,
    illustration: "volta",
    palette: ["#c9b88b", "#7d6a3f", "#3a2f1e"],
    photo: photos(
      "Basel Volta-Schulhaus.jpg",
      "Volta-Schulhaus Basel.jpg",
      "Schulhaus Volta Basel.jpg",
      "Volta-Schulhaus.jpg"
    ),
    text:
      "Hinter dem geschäftigen Wasgenring verbirgt sich ein kompaktes " +
      "Hofschulhaus mit tief ockerfarbenem Verputz — eine zeitgenössische " +
      "Neuinterpretation der Basler Schultypologie. Der Grundriss " +
      "drängt die Klassenzimmer eng um eine grosszügige, von oben " +
      "belichtete Halle und lehnt damit die Grossraummoden der Zeit ab.",
    interesting:
      "Achte auf die Tiefe der Fensterleibungen: sie sind nicht überall " +
      "gleich. Die südseitigen Fenster sitzen bis zu 60 cm tiefer in der " +
      "Wand als die nordseitigen — eine ganz analoge Sonnenschutz-Lösung."
  },
  {
    id: 5,
    name: "Siedlung Im Davidsboden",
    architect: "Diener & Diener",
    year: 1985,
    style: "Contemporary",
    address: "St. Johanns-Vorstadt",
    lat: 46.417850,
    lon: 7.785248,
    illustration: "davidsboden",
    palette: ["#e3d4b7", "#a98a5d", "#3d3225"],
    photo: photos(
      "Basel Siedlung Davidsboden.jpg",
      "Davidsboden Basel.jpg",
      "Siedlung Im Davidsboden Basel.jpg",
      "Im Davidsboden Basel.jpg"
    ),
    text:
      "Ein frühes Manifest der sogenannten 'Analogen' Architektur Basels: " +
      "anonym, ruhig, fast bewusst zurückhaltend. Roger Diener stapelt " +
      "88 Wohnungen zu einem nüchternen Blockrand, der das Stadtgefüge " +
      "so vervollständigt, als wäre er schon immer da gewesen.",
    interesting:
      "Such die Fensterbänke aus Sichtbeton: sie sind nur 22 mm dick und " +
      "kragen kaum aus der Fassade heraus — fast nicht wahrnehmbar. " +
      "Diener wollte das traditionelle Detail bis zur Unsichtbarkeit " +
      "reduzieren."
  },
  {
    id: 6,
    name: "Wohnhaus Schudel",
    architect: "Hannes Meyer",
    year: 1924,
    style: "Bauhaus",
    address: "Schwarzwaldallee",
    lat: 46.417488,
    lon: 7.784821,
    illustration: "schudel",
    palette: ["#cfc1a3", "#8a7549", "#332a1d"],
    photo: photos(
      "Wohnhaus Schudel Basel.jpg",
      "Haus Schudel Basel.jpg",
      "Hannes Meyer Wohnhaus Schudel.jpg",
      "Basel Schwarzwaldallee Schudel.jpg"
    ),
    text:
      "Vor Meyers Bauhaus-Direktorat erbaut, ist diese kleine " +
      "Familienvilla der Rohentwurf seines radikalen Funktionalismus. " +
      "Flachdach, Bandfenster, sichtbarer Betonsturz — beinahe " +
      "schockierend im Basel der mittleren 1920er-Jahre.",
    interesting:
      "Geh seitlich ums Haus und schau auf die Verputzlinie unterhalb " +
      "des Bandfensters: ein leichter Versatz von 5 mm zeigt, wo das " +
      "Fenster 1962 nach Westen erweitert wurde — Meyers strenge " +
      "Geometrie liess sich nicht einfach verlängern."
  },
  {
    id: 7,
    name: "Pavillon Sevogel",
    architect: "Suter & Suter",
    year: 1957,
    style: "Post-war",
    address: "Sevogelplatz",
    lat: 46.417156,
    lon: 7.784594,
    illustration: "pavillon",
    palette: ["#b7a47a", "#6e5b34", "#2d2418"],
    photo: photos(
      "Basel Pavillon Sevogel.jpg",
      "Pavillon Sevogel Basel.jpg",
      "Sevogelplatz Pavillon.jpg",
      "Tramwartehalle Sevogel Basel.jpg"
    ),
    text:
      "Ein winziger Nachkriegspavillon, den niemand fotografiert. " +
      "Faltwerkdach aus Beton, vollständig verglaste Fronten, " +
      "Terrazzoboden. Ursprünglich eine Tramwartehalle, heute ein " +
      "Quartiercafé.",
    interesting:
      "Stell dich unter eine der V-förmigen Dachflügel und schau nach " +
      "oben: die Spannweite beträgt 4,80 m, ohne einen einzigen sicht- " +
      "baren Träger. Suter & Suter haben das Tragwerk damals von Hand " +
      "berechnet — Computermodelle gab es noch nicht."
  },
  {
    id: 8,
    name: "Hechtliacker Wohnsiedlung",
    architect: "Reinhardt + Co.",
    year: 1979,
    style: "Post-war",
    address: "Hechtliacker",
    lat: 46.417014,
    lon: 7.784477,
    illustration: "hechtliacker",
    palette: ["#d9c7a0", "#9c7e4a", "#3a2e1c"],
    photo: photos(
      "Basel Hechtliacker.jpg",
      "Hechtliacker Basel.jpg",
      "Wohnsiedlung Hechtliacker.jpg",
      "Hechtliacker Siedlung.jpg"
    ),
    text:
      "Eine spätmoderne Wohnsiedlung, die sich biegend und stufend dem " +
      "Hang anpasst. Die Architekten verweigern eine einzige dominante " +
      "Schauseite — stattdessen punktieren Dutzende kleiner Loggien die " +
      "Backsteinvolumen.",
    interesting:
      "Lauf die Hangkante entlang und vergleiche die Loggia-Brüstungen: " +
      "keine zwei haben dieselbe Höhe. Jede ist exakt auf die Sitzhöhe " +
      "der jeweiligen Wohnung abgestimmt — ein versteckter Luxus für " +
      "die Bewohnenden."
  },
  {
    id: 9,
    name: "Schwarzpark Wohnhaus",
    architect: "Miller & Maranta",
    year: 2004,
    style: "Contemporary",
    address: "Schwarzpark, Gellertstrasse",
    lat: 46.417241,
    lon: 7.784366,
    illustration: "schwarzpark",
    palette: ["#a89878", "#62543a", "#2c241a"],
    photo: photos(
      "Basel Schwarzpark Wohnhaus.jpg",
      "Wohnhaus Schwarzpark Basel.jpg",
      "Schwarzpark Wohnhaus.jpg",
      "Miller Maranta Schwarzpark.jpg"
    ),
    text:
      "Ein einzelner Wohnblock, allein in einem öffentlichen Park — eine " +
      "Schweizer Lesart von Le Corbusiers Pavillon Suisse, aus dunkel " +
      "pigmentiertem Beton.",
    interesting:
      "An der Nordseite fällt das Licht im Sommer flach ein — jede " +
      "einzelne Holzmaserung der Schalbretter wird sichtbar. Streich mit " +
      "der Hand drüber: man fühlt jeden Knoten und Riss des Tannenholzes " +
      "aus dem Jahr 2003."
  },
  {
    id: 10,
    name: "Rheinhafen-Buvette",
    architect: "Buchner Bründler",
    year: 2011,
    style: "Contemporary",
    address: "Dreiländereck, Kleinhüningen",
    lat: 46.417353,
    lon: 7.784446,
    illustration: "buvette",
    palette: ["#bca982", "#6a5635", "#2a2117"],
    photo: photos(
      "Basel Buvette Dreilaendereck.jpg",
      "Buvette Dreiländereck Basel.jpg",
      "Dreilaendereck Buvette.jpg",
      "Rheinhafen Buvette Basel.jpg"
    ),
    text:
      "An der äussersten Spitze der Schweiz, wo der Rhein auf Frankreich " +
      "und Deutschland trifft, tarnt sich ein winziger Betonkiosk als " +
      "Stück Hafeninfrastruktur.",
    interesting:
      "Such die schweren Eisenbeschläge an den Seiten: damit werden die " +
      "Klappläden hochgezogen und in Markisen verwandelt. Geschlossen " +
      "ist der Bau ein Bunker — geöffnet ein Pavillon. Buchner Bründler " +
      "haben jedes Scharnier selbst geschmiedet."
  },
  {
    id: 11,
    name: "Wohnhaus am Brunngässlein",
    architect: "Hermann Baur",
    year: 1949,
    style: "Post-war",
    address: "Brunngässlein 12",
    lat: 46.417494,
    lon: 7.784219,
    illustration: "brunngaesslein",
    palette: ["#cbb98a", "#7d6839", "#332919"],
    photo: photos(
      "Brunngässlein 12 Basel.jpg",
      "Hermann Baur Brunngaesslein.jpg",
      "Basel Brunngaesslein 12.jpg",
      "Brunngaesslein Basel.jpg"
    ),
    text:
      "Hermann Baurs kleines Stadthaus schiebt sich mit grosser " +
      "Behutsamkeit zwischen zwei ältere Nachbarn. Ein Raster aus " +
      "Holzfenstern, ein Schieferdach, ein einzelner skulptural " +
      "geformter Betonbalkon — mehr nicht.",
    interesting:
      "Schau den Betonbalkon an: er sitzt asymmetrisch — 1,4 m vom " +
      "linken Fassadenrand, 2,1 m vom rechten. Baur hat ihn bewusst " +
      "verschoben, damit die innenliegende Treppe direkt ins Tageslicht " +
      "mündet. Eine kleine Skulptur im sonst strengen Raster."
  }
];

// Tour-Auswahl: sieben Basler Touren mit unterschiedlichen Themen und
// Quartieren. Nur die erste ist freigeschaltet, die übrigen sind noch
// im Aufbau.
window.TOURS = [
  { id: "basel-11",          city: "Basel", name: "11 Geheimtipps",                  count: 11, available: true,  blurb: "Versteckte Meisterwerke jenseits der Touristenpfade" },
  { id: "basel-altstadt",    city: "Basel", name: "Grossbasel — Altstadt",           count: 12, available: false, blurb: "Münsterplatz, Spalentor und das mittelalterliche Häuserbuch" },
  { id: "basel-kleinbasel",  city: "Basel", name: "Kleinbasel & Rheinpromenade",     count: 10, available: false, blurb: "Hafenarchitektur, Drei-Wettern-Skyline, Messe-Hochbauten" },
  { id: "basel-klybeck",     city: "Basel", name: "Industriequartier Klybeck",       count: 9,  available: false, blurb: "Backsteinfabriken, Wohnwerken und ein neuer Stadtteil" },
  { id: "basel-bauhaus",     city: "Basel", name: "Bauhaus-Spaziergang",             count: 8,  available: false, blurb: "Hannes Meyer, Hans Schmidt und die Schweizer Avantgarde" },
  { id: "basel-sakral",      city: "Basel", name: "Sakralbauten",                    count: 9,  available: false, blurb: "Vom Münster bis Karl Mosers Betonkirche" },
  { id: "basel-bruderholz",  city: "Basel", name: "Bruderholz — Gartenstadt",        count: 11, available: false, blurb: "Bernoullis Gartenstadt-Vision auf dem Plateau" }
];

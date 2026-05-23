/* eslint-disable */
// Elf versteckte architektonische Juwelen Basels, projiziert auf die elf
// Häuser des Weilers Biel im Lötschental (Kanton Wallis), erschlossen
// durch die Weritzalpstrasse.
//
// Die untenstehenden Koordinaten wurden vor Ort mit dem Edit-Modus der
// App platziert: jeder Marker auf das zugehörige Haus gezogen und über
// "Koordinaten kopieren" exportiert. Der Schwerpunkt liegt bei rund
// 46.41750° N, 7.78467° E.

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
    text:
      "Ein zarter sechseckiger Wasserturm, versteckt auf dem begrünten " +
      "Bruderholz-Plateau. Hans Bernoulli — eher bekannt als Theoretiker " +
      "der Gartenstadt — verleiht dem Zweckbau eine klassische Anmutung: " +
      "ein schlanker rustifizierter Sockel, ein gerillter Schaft aus " +
      "Sichtbeton und eine Kupferlaterne, die zu Grünspan verwittert ist. " +
      "Der Turm vermittelt still zwischen bürgerlichem Monument und " +
      "Ingenieurbau — eine frühe Schweizer Lesart der Neuen Sachlichkeit " +
      "in sanften Sandsteintönen."
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
    text:
      "Die erste vollständig in Stahlbeton errichtete Kirche der Schweiz " +
      "und eines der entscheidenden Bauwerke der europäischen modernen " +
      "Sakralarchitektur. Moser liess den Beton bretterrau und " +
      "pigmentgrau und öffnete eine grosse Fensterrose mit der " +
      "Glasmalerei Otto Staigers in die Westfassade. Von aussen wirkt " +
      "der Bau wie eine stille Basilika; im Inneren erhebt sich das " +
      "Schiff wie ein steinerner Wald — kompromisslos roh. Eine " +
      "Pilgerstätte für jede Architektin und jeden Architekten."
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
    text:
      "Egender bringt Bauhaus-Zurückhaltung in die protestantische " +
      "Pfarrkirche. Ein freistehender Campanile setzt sich vom " +
      "prismatischen Kirchenraum ab; die Eckfenster lassen Tageslicht " +
      "über das weiss verputzte Innere fluten. In den Krisenjahren " +
      "erbaut, wirkt die Kirche fast wie ein Schiff — lang, niedrig, " +
      "auf das westliche Licht gerichtet. Gemeindebereiche fügen sich " +
      "nahtlos um eine einzige, beinahe monastische Mittelachse."
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
    text:
      "Hinter dem geschäftigen Wasgenring verbirgt sich ein kompaktes " +
      "Hofschulhaus mit tief ockerfarbenem Verputz — eine zeitgenössische " +
      "Neuinterpretation der Basler Schultypologie. Der Grundriss " +
      "drängt die Klassenzimmer eng um eine grosszügige, von oben " +
      "belichtete Halle und lehnt damit die Grossraummoden der Zeit ab. " +
      "Miller & Maranta zeigen mit diesem Bau, dass Pädagogik und " +
      "tragendes Mauerwerk noch immer Verbündete sein können."
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
    text:
      "Ein frühes Manifest der sogenannten 'Analogen' Architektur Basels: " +
      "anonym, ruhig, fast bewusst zurückhaltend. Roger Diener stapelt " +
      "88 Wohnungen zu einem nüchternen Blockrand, der das Stadtgefüge " +
      "so vervollständigt, als wäre er schon immer da gewesen. Der " +
      "Rhythmus der Fassade — Lochfenster, kein Schmuck, sanfter " +
      "Zementputz — sollte eine ganze Generation des Schweizer " +
      "Wohnungsbaus prägen."
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
    text:
      "Vor Meyers Bauhaus-Direktorat erbaut, ist diese kleine " +
      "Familienvilla der Rohentwurf seines radikalen Funktionalismus. " +
      "Flachdach, Bandfenster, sichtbarer Betonsturz — beinahe " +
      "schockierend im Basel der mittleren 1920er-Jahre. Eine spürbare " +
      "Spannung herrscht zwischen dem geneigten Garten und dem " +
      "unerbittlich horizontalen Haus. Es wirkt noch immer eher wie ein " +
      "Argument als wie ein Zuhause."
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
    text:
      "Ein winziger Nachkriegspavillon, den niemand fotografiert. " +
      "Faltwerkdach aus Beton, vollständig verglaste Fronten, " +
      "Terrazzoboden. Ursprünglich eine Tramwartehalle, heute ein " +
      "Quartiercafé. Die V-förmigen Dachflügel kragen fast fünf Meter " +
      "aus, ohne einen einzigen sichtbaren Träger — ein kleines " +
      "Tragwerks-Bravourstück, vollbracht bevor Computerberechnungen " +
      "üblich waren."
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
    text:
      "Eine spätmoderne Wohnsiedlung, die sich biegend und stufend dem " +
      "Hang anpasst. Die Architekten verweigern eine einzige dominante " +
      "Schauseite — stattdessen punktieren Dutzende kleiner Loggien die " +
      "Backsteinvolumen. Von innen hat jede Wohnung ihre eigene Ecke " +
      "Himmel. Wohl das menschenfreundlichste Grosswohnprojekt des " +
      "Basels der 1970er-Jahre und ein leiser Tadel an den Plattenbau."
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
    text:
      "Ein einzelner Wohnblock, allein in einem öffentlichen Park — eine " +
      "Schweizer Lesart von Le Corbusiers Pavillon Suisse, aus dunkel " +
      "pigmentiertem Beton. Jede Wohnung belegt ein ganzes Geschoss mit " +
      "Fenstern auf drei Seiten. Den ganzen Nachmittag wandert der " +
      "Schatten naher Kastanien über die rauen, bretterrauen Wände. " +
      "Still, streng und tief durchdacht."
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
    text:
      "An der äussersten Spitze der Schweiz, wo der Rhein auf Frankreich " +
      "und Deutschland trifft, tarnt sich ein winziger Betonkiosk als " +
      "Stück Hafeninfrastruktur. Schwere Klappläden öffnen sich nach " +
      "oben zu Markisen; geschlossen ist der Bau ein versiegelter " +
      "Bunker. Buchner Bründler machen aus einem 30-Quadratmeter-" +
      "Programm eine Meditation über die Grenze selbst."
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
    text:
      "Hermann Baurs kleines Stadthaus schiebt sich mit grosser " +
      "Behutsamkeit zwischen zwei ältere Nachbarn. Ein Raster aus " +
      "Holzfenstern, ein Schieferdach, ein einzelner skulptural " +
      "geformter Betonbalkon — mehr nicht. Im Inneren jedoch offenbart " +
      "der Schnitt Splitlevel, einen doppelgeschossigen Wohnraum und " +
      "eine Dachterrasse, die das südliche Licht einfängt. Gilt als die " +
      "schönste Nachkriegsergänzung in der Basler Altstadt."
  }
];

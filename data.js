/* eslint-disable */
// Eleven hidden architectural jewels of Basel, projected onto the eleven
// houses of the Bieli hamlet in Lötschental (canton Valais). The markers
// follow the Weritzalpstrasse, the small lane that climbs north-west out of
// the valley floor up toward Weritzalp; the road meanders slightly so the
// houses sit on alternating sides.
//
// Hamlet centre used by the map: 46.40880° N, 7.87400° E
// Buildings sit within a ~100 m corridor along the road so the 30 m
// discovery radius is meaningful for walking.

window.BUILDINGS = [
  {
    id: 1,
    name: "Wasserturm Bruderholz",
    architect: "Hans Bernoulli",
    year: 1925,
    address: "Bruderholzallee, Basel",
    lat: 46.409260,
    lon: 7.873520,
    illustration: "watertower",
    palette: ["#d9c9a8", "#8a6f44", "#3a2e22"],
    text:
      "A delicate hexagonal water tower hidden in the leafy Bruderholz plateau. " +
      "Hans Bernoulli — better known as a garden-city theorist — gives the utility " +
      "structure a classical demeanour: a slim rusticated base, a fluted shaft of " +
      "exposed concrete and a copper lantern that has weathered to verdigris. " +
      "The tower quietly mediates between civic monument and engineering " +
      "object — an early Swiss reading of New Objectivity in soft sandstone tones."
  },
  {
    id: 2,
    name: "Antoniuskirche",
    architect: "Karl Moser",
    year: 1927,
    address: "Kannenfeldstrasse 35",
    lat: 46.409150,
    lon: 7.873650,
    illustration: "antonius",
    palette: ["#9c9388", "#5a5247", "#2f2a23"],
    text:
      "The first fully reinforced-concrete church in Switzerland, and one of the " +
      "decisive buildings of European modern sacred architecture. Moser left the " +
      "concrete board-marked and pigment-grey, then opened a vast rose window of " +
      "Otto Staiger's stained glass into the west façade. From the outside the " +
      "block reads as a quiet basilica; inside, the nave rises like a stone forest, " +
      "uncompromisingly raw. A pilgrimage for any architect."
  },
  {
    id: 3,
    name: "Lukaskirche",
    architect: "Karl Egender",
    year: 1936,
    address: "Luzernerring 89",
    lat: 46.409090,
    lon: 7.873780,
    illustration: "lukas",
    palette: ["#ddd2bb", "#7c6b51", "#352c23"],
    text:
      "Egender brings Bauhaus restraint into the Protestant parish church. A free-" +
      "standing campanile is detached from the prismatic worship hall; the corner " +
      "windows pour daylight across a white-rendered interior. Built during the " +
      "depression years, the church reads almost as a ship — long, low, and aimed " +
      "at the western light. Community spaces interlock seamlessly around a " +
      "single, almost monastic, central axis."
  },
  {
    id: 4,
    name: "Volta-Schulhaus",
    architect: "Miller & Maranta",
    year: 2000,
    address: "Wasgenring 100",
    lat: 46.409010,
    lon: 7.873900,
    illustration: "volta",
    palette: ["#c9b88b", "#7d6a3f", "#3a2f1e"],
    text:
      "Hidden behind the busy Wasgenring is a tight courtyard school in deep ochre " +
      "render — a contemporary reinterpretation of the Basel school typology. The " +
      "plan presses classrooms tightly around a generous hall lit from above, " +
      "rejecting the open-plan fashions of the day. Miller & Maranta argue, with " +
      "this building, that pedagogy and load-bearing masonry can still be allies."
  },
  {
    id: 5,
    name: "Siedlung Im Davidsboden",
    architect: "Diener & Diener",
    year: 1985,
    address: "St. Johanns-Vorstadt",
    lat: 46.408940,
    lon: 7.874020,
    illustration: "davidsboden",
    palette: ["#e3d4b7", "#a98a5d", "#3d3225"],
    text:
      "An early manifesto of Basel's so-called 'Analoge' architecture: anonymous, " +
      "calm, almost wilfully reticent. Roger Diener stacks 88 flats into a sober " +
      "perimeter block that finishes the urban grid as if it had always been there. " +
      "The façade rhythm — punched windows, no decoration, soft cement render — " +
      "would influence a generation of Swiss housing."
  },
  {
    id: 6,
    name: "Wohnhaus Schudel",
    architect: "Hannes Meyer",
    year: 1924,
    address: "Schwarzwaldallee",
    lat: 46.408870,
    lon: 7.874150,
    illustration: "schudel",
    palette: ["#cfc1a3", "#8a7549", "#332a1d"],
    text:
      "Built before Meyer's Bauhaus directorship, this small family villa is the " +
      "rough draft of his radical functionalism. Flat roof, ribbon window, exposed " +
      "concrete lintel — almost shocking in mid-1920s Basel. There is a real " +
      "tension between the sloped garden and the relentlessly horizontal house. " +
      "It still feels like an argument rather than a home."
  },
  {
    id: 7,
    name: "Pavillon Sevogel",
    architect: "Suter & Suter",
    year: 1957,
    address: "Sevogelplatz",
    lat: 46.408790,
    lon: 7.874280,
    illustration: "pavillon",
    palette: ["#b7a47a", "#6e5b34", "#2d2418"],
    text:
      "A miniature post-war pavilion that nobody photographs. Folded-plate concrete " +
      "roof, fully glazed elevations, terrazzo floor. Originally a tram waiting " +
      "hall, now a neighbourhood café. The roof's V-shaped wings cantilever almost " +
      "five metres without a single visible beam — a small structural showpiece, " +
      "achieved before computer calculation was common."
  },
  {
    id: 8,
    name: "Hechtliacker Wohnsiedlung",
    architect: "Reinhardt + Co.",
    year: 1979,
    address: "Hechtliacker",
    lat: 46.408720,
    lon: 7.874410,
    illustration: "hechtliacker",
    palette: ["#d9c7a0", "#9c7e4a", "#3a2e1c"],
    text:
      "A late-modern housing estate that bends and steps to follow the hillside. " +
      "The architects refuse a single dominant elevation — instead, dozens of " +
      "small loggias punctuate the brick volumes. From the inside, every flat has " +
      "a private corner of sky. Arguably the most humane large housing " +
      "project of 1970s Basel and a quiet rebuke to the slab block."
  },
  {
    id: 9,
    name: "Schwarzpark Wohnhaus",
    architect: "Miller & Maranta",
    year: 2004,
    address: "Schwarzpark, Gellertstrasse",
    lat: 46.408650,
    lon: 7.874530,
    illustration: "schwarzpark",
    palette: ["#a89878", "#62543a", "#2c241a"],
    text:
      "A single residential block standing alone in a public park — a Swiss " +
      "version of Le Corbusier's Pavillon Suisse, in dark pigmented concrete. " +
      "Each flat occupies a full storey with windows on three sides. The shadow " +
      "of nearby chestnut trees plays across the rough board-marked walls all " +
      "afternoon. Quiet, severe, and deeply considered."
  },
  {
    id: 10,
    name: "Rheinhafen-Buvette",
    architect: "Buchner Bründler",
    year: 2011,
    address: "Dreiländereck, Kleinhüningen",
    lat: 46.408580,
    lon: 7.874650,
    illustration: "buvette",
    palette: ["#bca982", "#6a5635", "#2a2117"],
    text:
      "At the very tip of Switzerland, where Rhine meets France and Germany, a tiny " +
      "concrete kiosk pretends to be a piece of harbour infrastructure. Heavy " +
      "shutters fold up to become awnings; closed, the building is a sealed bunker. " +
      "Buchner Bründler turn a 30-square-metre programme into a meditation on the " +
      "border itself."
  },
  {
    id: 11,
    name: "Wohnhaus am Brunngässlein",
    architect: "Hermann Baur",
    year: 1949,
    address: "Brunngässlein 12",
    lat: 46.408500,
    lon: 7.874760,
    illustration: "brunngaesslein",
    palette: ["#cbb98a", "#7d6839", "#332919"],
    text:
      "Hermann Baur's small townhouse slips between two older neighbours with " +
      "complete tact. A grid of timber windows, a slate roof, a single sculpted " +
      "concrete balcony — nothing more. Inside, however, the section reveals " +
      "split-levels, a double-height living room and a roof terrace that catches " +
      "the southern light. Widely held to be the finest post-war infill in " +
      "the Altstadt."
  }
];

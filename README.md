# Architekturführer Basel — Hidden Gems

An interactive walking guide to eleven of Basel's quieter architectural
jewels, drawn from Dorothee Huber's *Architekturführer Basel*. For
field-testing without travelling to Basel, the coordinates are projected
onto the small ensemble of houses in **Bieli, Lötschental**
([OSM way 60464330](https://www.openstreetmap.org/way/60464330)).

## Features

- **Live compass arrow** points to the closest of the 11 buildings.
- **30 m discovery radius**: walk within range and the building's
  description from the Architekturführer unlocks automatically.
- **Map overview** (Leaflet + OpenStreetMap) with all 11 markers and a
  live user position with 30 m radius circle.
- **Persistent progress** in `localStorage` — discovered buildings stay
  unlocked between visits.
- **Mobile-first**, works without any backend; deployed as a static
  site to GitHub Pages.

## The eleven jewels

1. Wasserturm Bruderholz — Hans Bernoulli, 1925
2. Antoniuskirche — Karl Moser, 1927
3. Lukaskirche — Karl Egender, 1936
4. Volta-Schulhaus — Miller & Maranta, 2000
5. Siedlung Im Davidsboden — Diener & Diener, 1985
6. Wohnhaus Schudel — Hannes Meyer, 1924
7. Pavillon Sevogel — Suter & Suter, 1957
8. Hechtliacker Wohnsiedlung — Reinhardt + Co., 1979
9. Schwarzpark Wohnhaus — Miller & Maranta, 2004
10. Rheinhafen-Buvette — Buchner Bründler, 2011
11. Wohnhaus am Brunngässlein — Hermann Baur, 1949

## Run locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Browser geolocation only works on `https://` or `localhost`.

## Deploy

`main` is deployed automatically by the GitHub Actions workflow at
`.github/workflows/pages.yml`. Enable Pages → Source: GitHub Actions in
the repository settings.

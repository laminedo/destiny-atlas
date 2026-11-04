# Destiny Atlas

A complete astrology, numerology, and Chinese zodiac reading web app (Next.js, TypeScript, Tailwind).

## Run it

```bash
cd web
cp .env.local.example .env.local   # then paste your Anthropic API key
npm install
npm run dev                        # http://localhost:3000
```

Everything except the AI-written readings (Full Reading and the compatibility reading) works without an API key.

## What's calculated (all in the browser, no paid APIs)

- **Western (tropical)**: Sun–Pluto, mean North/South Node, mean Lilith, Ascendant, Midheaven,
  Part of Fortune; Placidus / Whole Sign / Equal houses (Porphyry fallback near the poles);
  dignities, retrogrades, aspects with orbs, Grand Trine / T-Square / Grand Cross / Yod / Stellium,
  element / modality / hemisphere balance, chart ruler, dominant planet and sign.
- **Vedic (sidereal, Lahiri)**: Rashi (D1) and Navamsa (D9) in South or North Indian style, nakshatras
  and padas, Vimshottari mahadashas and antardashas, Pancha Mahapurusha and other key yogas,
  Mangal Dosha, Sade Sati.
- **Numerology** (Pythagorean or Chaldean): Life Path, Expression, Soul Urge, Personality, Birthday,
  Maturity, Attitude, current-name Expression, Karmic Debt and Lessons, Hidden Passion,
  Pinnacles and Challenges with ages, Personal Year / Month / Day, Universal Year, Lo Shu grid.
- **Chinese**: year animal using the true Lunar New Year (including leap-month years such as 2033),
  inner / true / secret animals, Four Pillars (BaZi) with Day Master, five-element balance,
  compatibility, the current year.
- **Timeline**: Saturn, Jupiter, and Nodal returns, Uranus opposition, and Neptune square with exact
  dates; current slow-planet transits.
- **Forecast**: secondary progressions (with solar-arc angles and the progressed lunar phase), a
  Solar Return chart for where you spent your birthday, eclipses over the next 2 years that hit natal
  points, and a Mercury / Venus / Mars retrograde calendar by house.
- **Compatibility**: synastry inter-aspects, a composite chart, Romance / Communication / Values /
  Stability / Chemistry scores with the aspects behind them, Life Path and Chinese-sign matching.
- **Cosmic card**: a shareable PNG (1:1 post or 9:16 story, night or dawn style) with the person's
  wheel, Big Three, Life Path, Chinese sign and nakshatra. Name and birth date are opt-in; birth time
  and place never appear. Download, native share on phones, or copy a caption.
- **AI readings**: a 12-section life reading or a compatibility reading, plus follow-up Q&A, written
  by one of two engines. The model only interprets pre-computed data; it never calculates.
  - **Gemini, with the visitor's own key** (`src/lib/gemini.ts`): on first use the site asks for a
    free Gemini API key from Google AI Studio, checks it, and lets the visitor pick a model. The key
    is stored only in their browser and sent only to Google, so this works on the static GitHub Pages
    site and costs the site owner nothing.
  - **Claude on a server** (`src/app/api/reading/route.ts`, `claude-opus-5-5`): used when the app runs
    with a server and `ANTHROPIC_API_KEY` is set. Visitors can still switch to their own Gemini key.
  Both use the same instructions in `src/lib/readingPrompt.ts`.

Ephemeris: [Astronomy Engine](https://github.com/cosinekitty/astronomy) (MIT; no AGPL Swiss
Ephemeris licence needed). Geocoding: Open-Meteo (free, no key). Timezones: IANA via Luxon,
including historical daylight saving rules.

## Publish to GitHub Pages

Every push to `main` runs `.github/workflows/pages.yml`: it runs the calculation checks, builds a
static copy of the site (without the AI reading API, which needs a server), and deploys it to
https://laminedo.github.io/destiny-atlas/. You can also start it by hand from the repository's
Actions tab.

To publish from your own machine instead (pushes to a `gh-pages` branch), run
`npm run deploy:pages` and set Pages to "Deploy from a branch".

On the static site, AI readings use each visitor's own Gemini key; everything else runs in the
visitor's browser.

## Verify the math

```bash
npm run verify
```

This checks planet and angle positions against J2000 almanac values, Lahiri ayanamsa against
Makar and Mesha Sankranti, Lunar New Year dates (including leap-month years), nakshatras, navamsas,
dashas, BaZi day pillars, eclipse dates, retrograde lengths, numerology, and historical daylight saving.

## Not yet built

Chiron (needs an ephemeris that covers it), other ayanamsas, Vedic Ashtakoota (36-guna) matching,
user accounts with synced profiles (e.g. Supabase), and payments (e.g. Stripe).

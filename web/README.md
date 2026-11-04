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
- **AI readings**: `src/app/api/reading/route.ts` streams a 12-section life reading or a compatibility
  reading, plus follow-up Q&A, from Claude (`claude-opus-5-5`). The model only interprets
  pre-computed data; it never calculates.

Ephemeris: [Astronomy Engine](https://github.com/cosinekitty/astronomy) (MIT; no AGPL Swiss
Ephemeris licence needed). Geocoding: Open-Meteo (free, no key). Timezones: IANA via Luxon,
including historical daylight saving rules.

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

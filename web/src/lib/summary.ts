import { formatDegree } from "./astro/math";
import { ordinal } from "./astro/western";
import type { Profile } from "./profile";

/** Compact, model-friendly view of a computed profile. All numbers are pre-computed; the model never calculates. */
export function summarizeProfile(p: Profile) {
  const w = p.western;
  const n = p.numerology;
  const c = p.chinese;
  return {
    person: {
      birthName: p.input.birthName,
      currentName: p.input.currentName || undefined,
      pronouns: p.input.pronouns || undefined,
      birth: `${p.input.date}${p.input.time && p.input.timeAccuracy !== "unknown" ? ` ${p.input.time}` : ""} (${p.input.place.name}, UTC${p.utcOffset})`,
      birthTimeAccuracy: p.input.timeAccuracy,
      focusAreas: p.input.focus,
      currentQuestion: p.input.question || undefined,
      ageToday: Math.floor((Date.parse(p.computedAt) - Date.parse(p.utc)) / (365.25 * 86400000)),
      today: p.computedAt.slice(0, 10),
    },
    westernTropical: {
      houseSystem: w.hasBirthTime ? w.houseSystemUsed : "none (birth time unknown — houses, Ascendant and Midheaven omitted; Moon may be off by up to ~6°)",
      placements: w.points.map((pt) =>
        `${pt.name}: ${formatDegree(pt.lon)}${pt.house ? `, ${ordinal(pt.house)} house` : ""}${pt.retrograde ? ", retrograde" : ""}${pt.dignity ? `, ${pt.dignity}` : ""}`),
      houseCusps: w.hasBirthTime ? w.houses.map((h, i) => `${ordinal(i + 1)}: ${formatDegree(h)}`) : undefined,
      majorAspects: w.aspects.slice(0, 30).map((a) => `${a.a} ${a.type} ${a.b} (orb ${a.orb}°${a.applying ? ", applying" : ""})`),
      patterns: w.patterns.map((pt) => `${pt.type}: ${pt.points.join(", ")}${pt.detail ? ` — ${pt.detail}` : ""}`),
      elementBalance: w.elements,
      modalityBalance: w.modalities,
      hemispheres: w.hasBirthTime ? w.hemispheres : undefined,
      chartRuler: w.chartRuler,
      dominantPlanet: w.dominantPlanet,
      dominantSign: w.dominantSign,
      sect: w.hasBirthTime ? (w.isDayChart ? "day chart" : "night chart") : undefined,
    },
    numerology: {
      system: n.system,
      lifePath: `${n.lifePath.value} (${n.lifePath.steps})`,
      expression: n.expression.value,
      soulUrge: n.soulUrge.value,
      personality: n.personality.value,
      birthday: n.birthday.value,
      maturity: n.maturity.value,
      attitude: n.attitude.value,
      currentNameExpression: n.currentNameExpression?.value,
      karmicDebts: n.karmicDebts.map((k) => `${k.number} in ${k.source}`),
      karmicLessons: n.karmicLessons,
      hiddenPassion: n.hiddenPassion,
      pinnacles: n.pinnacles.map((x) => `${x.number} (age ${x.fromAge}–${x.toAge ?? "end"})`),
      challenges: n.challenges.map((x) => `${x.number} (age ${x.fromAge}–${x.toAge ?? "end"})`),
      personalYear: n.personalYear,
      personalMonth: n.personalMonth,
      personalDay: n.personalDay,
      universalYear: n.universalYear,
      loShuArrowsOfStrength: n.loShu.arrowsOfStrength,
      loShuMissingArrows: n.loShu.missingArrows,
    },
    chinese: {
      zodiac: `${c.polarity} ${c.element} ${c.animal} (lunar year from ${c.lunarNewYear})`,
      innerAnimal: c.innerAnimal,
      trueAnimal: c.trueAnimal,
      secretAnimal: c.secretAnimal ?? "unknown (no birth time)",
      fourPillars: c.pillars.map((pl) => `${pl.label}: ${pl.stem}-${pl.branch} (${pl.polarity} ${pl.element} ${pl.animal})`),
      dayMaster: `${c.dayMaster.polarity} ${c.dayMaster.element} (${c.dayMaster.stem})`,
      fiveElementBalance: c.elementBalance,
      bestMatches: c.bestMatches,
      clash: c.clash,
      currentYear: `${c.currentYear.element} ${c.currentYear.animal} ${c.currentYear.year}: ${c.currentYear.relation}`,
    },
    vedicSidereal: {
      ayanamsa: `Lahiri ${p.vedic.ayanamsa.toFixed(2)}°`,
      lagna: p.vedic.lagna ? `${formatDegree(p.vedic.lagna.lon)} (${p.vedic.lagna.nakshatra} pada ${p.vedic.lagna.pada})` : "unknown (no birth time)",
      grahas: p.vedic.grahas.map((g) => `${g.name}: ${formatDegree(g.lon)}${g.house ? `, house ${g.house}` : ""}, ${g.nakshatra} pada ${g.pada}, navamsa ${g.navamsa}${g.dignity ? `, ${g.dignity}` : ""}`),
      moonNakshatra: `${p.vedic.moonNakshatra.name} pada ${p.vedic.moonNakshatra.pada} (lord ${p.vedic.moonNakshatra.lord})`,
      currentDasha: p.vedic.currentDasha ? `${p.vedic.currentDasha.maha} mahadasha until ${p.vedic.currentDasha.mahaEnds}, ${p.vedic.currentDasha.antar} antardasha until ${p.vedic.currentDasha.antarEnds}` : undefined,
      mahadashas: p.vedic.dashas.map((d) => `${d.lord}: ${d.start} → ${d.end}`),
      yogas: p.vedic.yogas.map((y) => y.name),
      mangalDosha: p.vedic.mangalDosha.present,
      sadeSati: p.vedic.sadeSati.active ? p.vedic.sadeSati.phase : "not active",
    },
    forecast: {
      progressedSun: formatDegree(p.progressions.sun.lon),
      progressedMoon: `${formatDegree(p.progressions.moon.lon)}${p.progressions.moon.nextSign ? ` (enters ${p.progressions.moon.nextSign} ~${p.progressions.moon.nextSignChange})` : ""}`,
      progressedAscendant: p.progressions.ascendant ? formatDegree(p.progressions.ascendant.lon) : undefined,
      progressedLunarPhase: p.progressions.lunarPhase.name,
      solarReturn: {
        moment: p.solarReturn.moment,
        location: p.solarReturn.locationName,
        highlights: p.solarReturn.highlights,
      },
      eclipsesNext2Years: p.eclipses.map((e) => `${e.date} ${e.kind} at ${formatDegree(e.lon)}${e.natalHouse ? `, natal house ${e.natalHouse}` : ""}${e.contacts.length ? `, ${e.contacts.join(", ")}` : ""}`),
      retrogradesNext12Months: p.retrogrades.map((r) => `${r.planet} Rx ${r.start} → ${r.end}${r.natalHouses.length ? `, houses ${r.natalHouses.join("/")}` : ""}`),
    },
    timing: {
      lifeCycles: p.lifeCycles.map((e) => `${e.label}: age ~${e.age} (${e.dates.join(", ")})`),
      currentTransits: p.transits.slice(0, 12).map((t) => `Transiting ${t.transiting} ${t.type} natal ${t.natal} (orb ${t.orb}°${t.applying ? ", applying" : ", separating"})`),
    },
  };
}

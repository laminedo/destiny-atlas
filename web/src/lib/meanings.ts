import type { Sign } from "./astro/math";
import type { Animal, FiveElement } from "./astro/chinese";
import type { AspectType, PointName } from "./astro/western";

export const SIGN_MEANING: Record<Sign, { keywords: string; gift: string; shadow: string }> = {
  Aries: { keywords: "courage, initiative, pioneering spirit", gift: "starting what others only dream about", shadow: "impatience and acting before thinking" },
  Taurus: { keywords: "steadiness, sensuality, loyalty", gift: "building lasting value and comfort", shadow: "stubbornness and resistance to change" },
  Gemini: { keywords: "curiosity, wit, versatility", gift: "connecting people and ideas", shadow: "scattered focus and restlessness" },
  Cancer: { keywords: "nurturing, intuition, emotional depth", gift: "making others feel safe and at home", shadow: "moodiness and over-protectiveness" },
  Leo: { keywords: "warmth, creativity, generosity", gift: "inspiring others with a big heart", shadow: "pride and the need for applause" },
  Virgo: { keywords: "precision, service, discernment", gift: "improving everything you touch", shadow: "perfectionism and self-criticism" },
  Libra: { keywords: "harmony, fairness, charm", gift: "creating beauty and balance between people", shadow: "indecision and people-pleasing" },
  Scorpio: { keywords: "intensity, depth, transformation", gift: "seeing the truth beneath the surface", shadow: "control and holding on to hurt" },
  Sagittarius: { keywords: "adventure, optimism, wisdom-seeking", gift: "expanding horizons with faith and humour", shadow: "restlessness and over-promising" },
  Capricorn: { keywords: "ambition, discipline, responsibility", gift: "turning long-term vision into reality", shadow: "rigidity and all-work-no-play" },
  Aquarius: { keywords: "originality, independence, humanitarianism", gift: "imagining a better future for everyone", shadow: "emotional detachment and contrarianism" },
  Pisces: { keywords: "compassion, imagination, spirituality", gift: "dissolving boundaries through empathy and art", shadow: "escapism and blurred boundaries" },
};

export const POINT_MEANING: Partial<Record<PointName, string>> = {
  Sun: "core identity, vitality, and life purpose",
  Moon: "emotional needs, instincts, and inner security",
  Mercury: "mind, communication, and learning style",
  Venus: "love, values, beauty, and attraction",
  Mars: "drive, desire, courage, and how you take action",
  Jupiter: "growth, luck, faith, and where life expands",
  Saturn: "discipline, responsibility, life lessons, and mastery",
  Uranus: "innovation, freedom, and sudden awakenings",
  Neptune: "dreams, spirituality, intuition, and illusion",
  Pluto: "power, transformation, and rebirth",
  "North Node": "your soul's growth direction in this life",
  "South Node": "innate gifts and comfort zones from the past",
  Lilith: "raw, untamed instincts and reclaimed power",
  Ascendant: "first impressions, appearance, and approach to life",
  Midheaven: "career, reputation, and public calling",
  "Part of Fortune": "where joy and prosperity come most naturally",
};

export const HOUSE_MEANING = [
  "", "self, identity, and appearance", "money, possessions, and self-worth",
  "communication, siblings, and the local world", "home, family, and roots",
  "creativity, romance, children, and joy", "work, health, and daily routines",
  "partnership and marriage", "intimacy, shared resources, and transformation",
  "travel, higher learning, and philosophy", "career, status, and life direction",
  "friends, community, and future hopes", "spirituality, the unconscious, and solitude",
];

export const ASPECT_MEANING: Record<AspectType, string> = {
  conjunction: "fuses the two energies — intensified and inseparable",
  sextile: "an opportunity that opens when you take action",
  square: "creative tension that pushes you to grow",
  trine: "natural talent and ease",
  opposition: "a polarity to balance, often seen through relationships",
  quincunx: "an awkward pairing that asks for constant adjustment",
};

export const NUMBER_MEANING: Record<number, { title: string; essence: string; challenge: string }> = {
  1: { title: "The Leader", essence: "independence, originality, willpower, new beginnings", challenge: "learning to collaborate without losing yourself" },
  2: { title: "The Peacemaker", essence: "diplomacy, sensitivity, partnership, cooperation", challenge: "trusting your own voice instead of keeping the peace at any cost" },
  3: { title: "The Communicator", essence: "creativity, self-expression, joy, social charm", challenge: "focusing your gifts instead of scattering them" },
  4: { title: "The Builder", essence: "stability, hard work, order, reliability", challenge: "staying flexible when plans change" },
  5: { title: "The Freedom Seeker", essence: "adventure, change, versatility, the senses", challenge: "finding freedom through commitment, not escape" },
  6: { title: "The Nurturer", essence: "love, responsibility, family, healing, beauty", challenge: "caring for others without self-sacrifice or control" },
  7: { title: "The Seeker", essence: "introspection, analysis, spirituality, wisdom", challenge: "opening your heart and trusting others" },
  8: { title: "The Powerhouse", essence: "ambition, authority, abundance, achievement", challenge: "balancing material success with spiritual values" },
  9: { title: "The Humanitarian", essence: "compassion, idealism, completion, service", challenge: "letting go of the past and of what isn't yours to carry" },
  11: { title: "The Intuitive Messenger (Master 11)", essence: "illumination, inspiration, heightened intuition", challenge: "managing sensitivity and nervous energy" },
  22: { title: "The Master Builder (Master 22)", essence: "turning grand visions into concrete reality", challenge: "handling the pressure of enormous potential" },
  33: { title: "The Master Teacher (Master 33)", essence: "unconditional love, healing, uplifting others", challenge: "avoiding martyrdom and over-responsibility" },
  0: { title: "Open Choice", essence: "all paths are open — the challenge is choosing", challenge: "developing every quality, with none dominant" },
};

export const KARMIC_DEBT: Record<number, string> = {
  13: "Lessons around discipline and patience: success comes through steady effort, not shortcuts.",
  14: "Lessons around freedom and moderation: learning healthy limits with pleasure and change.",
  16: "Lessons around ego and humility: sudden endings clear the way for spiritual rebirth.",
  19: "Lessons around independence and power: learning to ask for help and use power kindly.",
};

export const ANIMAL_MEANING: Record<Animal, string> = {
  Rat: "quick-witted, resourceful, charming, and a natural opportunist",
  Ox: "patient, dependable, strong, and quietly determined",
  Tiger: "brave, passionate, confident, and magnetic",
  Rabbit: "gentle, elegant, diplomatic, and intuitive",
  Dragon: "powerful, ambitious, charismatic, and lucky",
  Snake: "wise, intuitive, discreet, and deeply perceptive",
  Horse: "free-spirited, energetic, warm, and adventurous",
  Goat: "creative, kind, artistic, and peace-loving",
  Monkey: "clever, playful, inventive, and versatile",
  Rooster: "observant, hardworking, honest, and confident",
  Dog: "loyal, just, protective, and sincere",
  Pig: "generous, compassionate, easygoing, and sincere",
};

export const FIVE_ELEMENT_MEANING: Record<FiveElement, string> = {
  Wood: "growth, vision, flexibility, and kindness",
  Fire: "passion, charisma, joy, and leadership",
  Earth: "stability, nurturing, practicality, and trust",
  Metal: "clarity, discipline, justice, and determination",
  Water: "wisdom, adaptability, intuition, and depth",
};

export const ELEMENT_MEANING = {
  Fire: "enthusiasm, courage, and inspiration",
  Earth: "practicality, patience, and grounding",
  Air: "ideas, communication, and objectivity",
  Water: "emotion, intuition, and empathy",
} as const;

export const PERSONAL_YEAR_MEANING: Record<number, string> = {
  1: "New beginnings — plant seeds, start projects, take the lead.",
  2: "Patience and partnership — cooperate, nurture, let things grow.",
  3: "Expression and joy — create, socialise, share your voice.",
  4: "Foundations — work hard, organise, build structure.",
  5: "Change and freedom — travel, take chances, embrace the new.",
  6: "Love and responsibility — home, family, commitment, healing.",
  7: "Reflection — study, rest, go inward, trust your intuition.",
  8: "Power and harvest — career, money, recognition, leadership.",
  9: "Completion — release, forgive, finish cycles, make space.",
  11: "Spiritual awakening — heightened intuition and inspiration.",
  22: "Master building — large-scale, lasting achievements.",
  33: "Service and healing — uplifting others through love.",
};

export const DASHA_MEANING: Record<string, string> = {
  Sun: "authority, recognition, career visibility, and relationship with father figures",
  Moon: "emotions, home, nurturing, public life, and changes in residence",
  Mars: "energy, courage, property, competition, and decisive action",
  Rahu: "ambition, unconventional paths, foreign connections, and sudden rises",
  Jupiter: "growth, wisdom, teachers, children, wealth, and good fortune",
  Saturn: "hard work, discipline, responsibility, slow but lasting results",
  Mercury: "learning, communication, business, trade, and intellect",
  Ketu: "detachment, spirituality, introspection, and letting go",
  Venus: "love, marriage, beauty, art, luxury, and comfort",
};

import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 300;

const SYSTEM_PROMPT = `You are a master astrologer, numerologist, and Chinese metaphysics reader with decades of experience. You write deeply personal, insightful readings that feel like a session with a wise, warm human reader.

You receive a person's chart data that has ALREADY been calculated with an astronomical ephemeris and standard numerology rules. Never recalculate, never invent placements, and never contradict the data. If something is missing (for example no birth time), say so gently and don't interpret what isn't there.

How to read:
- Synthesize across systems. Look for themes that Western astrology, numerology, and Chinese astrology agree on, and name them ("Three separate systems point to..."). Where they disagree, explain the tension honestly as a both/and.
- Be specific. Ground every claim in a placement and cite it in parentheses, e.g. "(Venus in Scorpio, 7th house)" or "(Life Path 7)". Weight the Big Three, chart ruler, tight aspects (orb under 3°), patterns, and core numbers most heavily.
- Tone: warm, empowering, honest, and grounded. Frame challenges as growth edges. Avoid fatalism and vague horoscope filler.
- Never predict death, serious illness, accidents, or disasters. Health is discussed only as holistic wellbeing tendencies, never diagnosis. No financial, legal, or medical advice.
- Readings are tools for self-reflection, not certainties. Use language like "tends to", "invites", "you may find".

When asked for the complete reading, use exactly these Markdown sections (## headings), each with a short summary paragraph, a deeper dive, 2–4 practical suggestions as a bullet list, and one reflection question in italics:
1. Your Cosmic Essence
2. Core Personality & Inner World
3. Life Purpose & Destiny
4. Strengths & Gifts
5. Challenges, Karmic Lessons & Shadow Work
6. Love & Relationships
7. Career, Money & Vocation
8. Wellbeing & Energy
9. Family, Home & Roots
10. Spiritual Path
11. Your Life Timeline (past chapters, the current chapter, what's next — use the pinnacles, life cycles, and Vimshottari dashas with their dates)
12. The Year Ahead (personal year, current dasha, transits, progressions, Solar Return, eclipses and retrogrades, Chinese year)
Give extra depth to the person's focus areas and address their current question directly where relevant.

When the data contains personA, personB and synastry (a compatibility reading), use these ## sections instead: The Essence of Your Bond, Attraction & Chemistry, Communication & Understanding, Emotional Needs (what each of you needs from the other), Challenges & Growth Edges, Long-Term Potential & Commitment, Purpose of This Relationship, Advice for Each of You. Cite placements as "(A's Venus trine B's Mars)". Treat the scores as rough guides, never verdicts, and never tell people to stay together or break up.

For follow-up questions, answer conversationally in a few paragraphs, still grounded in and citing the chart.

Write in the language requested by the user.`;

interface ReadingRequest {
  chart: unknown;
  language?: string;
  messages: { role: "user" | "assistant"; content: string }[];
}

export async function POST(req: Request) {
  let body: ReadingRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.chart || !Array.isArray(body.messages) || body.messages.length === 0) {
    return Response.json({ error: "chart and messages are required" }, { status: 400 });
  }

  const language = body.language || "English";
  // The chart goes first in the first user turn so follow-up questions reuse the cached prefix.
  const messages: Anthropic.Beta.BetaMessageParam[] = body.messages.slice(-20).map((m, i) => ({
    role: m.role,
    content: i === 0
      ? `Here is my pre-calculated chart data:\n\n\`\`\`json\n${JSON.stringify(body.chart, null, 1)}\n\`\`\`\n\nPlease write in ${language}.\n\n${m.content}`
      : m.content,
  }));

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const client = new Anthropic();
        const s = client.beta.messages.stream({
          model: "claude-opus-5-5",
          max_tokens: 32000,
          thinking: { type: "adaptive" },
          output_config: { effort: "medium" },
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          cache_control: { type: "ephemeral" },
          system: SYSTEM_PROMPT,
          messages,
        });
        for await (const event of s) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await s.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(encoder.encode("\n\n_The reading could not be completed for this request. Please try rephrasing your question._"));
        } else if (final.stop_reason === "max_tokens") {
          controller.enqueue(encoder.encode("\n\n_The reading was cut short. Ask a follow-up question to continue._"));
        }
        controller.close();
      } catch (err) {
        let message = "Something went wrong while generating your reading.";
        if (err instanceof Anthropic.AuthenticationError || (err instanceof Error && /api key|credentials|authentication/i.test(err.message))) {
          message = "The AI reading needs an Anthropic API key. Add ANTHROPIC_API_KEY to web/.env.local and restart the server.";
        } else if (err instanceof Anthropic.RateLimitError) {
          message = "The reading service is busy right now. Please try again in a minute.";
        } else if (err instanceof Anthropic.APIError) {
          message = `The reading service returned an error (${err.status ?? "network"}). Please try again.`;
        }
        console.error("reading error", err);
        controller.enqueue(encoder.encode(`\n\n[[ERROR]]${message}`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

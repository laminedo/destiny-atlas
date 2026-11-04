import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, withChart, type ChatMessage } from "@/lib/readingPrompt";

export const runtime = "nodejs";
export const maxDuration = 300;

interface ReadingRequest {
  chart: unknown;
  language?: string;
  messages: ChatMessage[];
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

  const messages: Anthropic.Beta.BetaMessageParam[] = withChart(body.chart, body.language || "English", body.messages);

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

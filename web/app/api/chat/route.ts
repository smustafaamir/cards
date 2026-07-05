import Groq from "groq-sdk";
import { NextRequest } from "next/server";
import { z } from "zod";

import { getOptionalEnv } from "@/lib/env";
import { retrieveChunks } from "@/lib/rag-client";
import type { Citation, RetrievedChunk } from "@/lib/search/types";

const chatSchema = z.object({
  message: z.string().min(1),
  topK: z.number().min(1).max(10).optional(),
});

function buildPrompt(query: string, chunks: RetrievedChunk[]): {
  system: string;
  user: string;
  citations: Citation[];
} {
  const citations: Citation[] = chunks.map((chunk, index) => ({
    index: index + 1,
    paperId: chunk.paperId,
    title: chunk.title,
    source: chunk.source,
    page: chunk.page,
  }));

  const context = chunks
    .map((chunk, index) => {
      const pageInfo = chunk.page ? `, page ${chunk.page}` : "";
      return `[${index + 1}] ${chunk.title} (${chunk.source}${pageInfo})\n${chunk.text}`;
    })
    .join("\n\n");

  const system = `You are a research assistant. Answer only using the provided context from the user's paper library.
If the context does not contain enough information, say so clearly.
Cite sources inline using [1], [2], etc. matching the context chunk numbers.`;

  const user = `Context:\n${context || "No relevant context found."}\n\nQuestion: ${query}`;

  return { system, user, citations };
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), { status: 400 });
  }

  const apiKey = getOptionalEnv("GROQ_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "GROQ_API_KEY is not configured" }), {
      status: 500,
    });
  }

  const { message, topK = 5 } = parsed.data;

  let chunks: RetrievedChunk[];
  try {
    chunks = await retrieveChunks(message, topK);
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "Retrieval failed";
    return new Response(JSON.stringify({ error: errMessage }), { status: 502 });
  }

  const { system, user, citations } = buildPrompt(message, chunks);
  const model = getOptionalEnv("GROQ_MODEL", "llama-3.1-8b-instant");
  const groq = new Groq({ apiKey });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        send("citations", { citations });

        const completion = await groq.chat.completions.create({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          stream: true,
          temperature: 0.2,
        });

        for await (const chunk of completion) {
          const token = chunk.choices[0]?.delta?.content;
          if (token) {
            send("token", { token });
          }
        }

        send("done", { ok: true });
      } catch (error) {
        const errMessage = error instanceof Error ? error.message : "Groq request failed";
        const status = errMessage.includes("429") ? 429 : 502;
        send("error", { error: errMessage, status });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

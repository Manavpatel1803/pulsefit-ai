import Groq from "groq-sdk";

let client: Groq | null = null;

const CHAT_MODEL = "llama-3.3-70b-versatile";

/** Server-only. Never import this file from a "use client" component. */
export function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not set in the server environment.");
  }
  if (!client) {
    client = new Groq({ apiKey });
  }
  return client;
}

export async function generateJson(prompt: string): Promise<string> {
  const groq = getGroqClient();
  const completion = await groq.chat.completions.create({
    model: CHAT_MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You always respond with a single valid JSON object and nothing else.",
      },
      { role: "user", content: prompt },
    ],
  });
  return completion.choices[0]?.message?.content ?? "{}";
}

export async function generateChatReply(
  systemPrompt: string,
  history: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  const groq = getGroqClient();
  const completion = await groq.chat.completions.create({
    model: CHAT_MODEL,
    messages: [{ role: "system", content: systemPrompt }, ...history],
  });
  return completion.choices[0]?.message?.content ?? "";
}

import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

export async function GET() {
  try {
    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: "Hello, how are you?",
    });
    return new Response(text);
  } catch (error) {
    return new Response(error instanceof Error ? error.message : String(error), { status: 500 });
  }
}
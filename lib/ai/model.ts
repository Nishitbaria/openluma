import { devToolsMiddleware } from "@ai-sdk/devtools";
import {
  type OpenAILanguageModelResponsesOptions,
  openai,
} from "@ai-sdk/openai";
import { wrapLanguageModel } from "ai";

const base = openai("gpt-5.6-luna");

export const model =
  process.env.NODE_ENV === "development"
    ? wrapLanguageModel({ middleware: devToolsMiddleware(), model: base })
    : base;

// Thinking mode: medium reasoning effort with condensed summaries that
// stream to the UI as reasoning parts (rendered by the Reasoning component).
export const reasoningProviderOptions = {
  openai: {
    reasoningEffort: "medium",
    reasoningSummary: "auto",
  } satisfies OpenAILanguageModelResponsesOptions,
};

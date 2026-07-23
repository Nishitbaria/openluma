import { devToolsMiddleware } from "@ai-sdk/devtools";
import { openai } from "@ai-sdk/openai";
import { wrapLanguageModel } from "ai";

const base = openai("gpt-5-mini");

export const model =
  process.env.NODE_ENV === "development"
    ? wrapLanguageModel({ middleware: devToolsMiddleware(), model: base })
    : base;

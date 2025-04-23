import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY is not set in environment variables.");
}

const genAI = new GoogleGenerativeAI(apiKey || "");

const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

export async function POST(req: Request) {
  if (!apiKey) {
    return NextResponse.json(
      { error: "Gemini API Key is not configured on the server." },
      { status: 500 }
    );
  }

  const { text, direction, modernStyle } = await req.json();
  console.log("Gemini Translate Request - Direction:", direction);

  let sourceLang = "";
  let targetLang = "";
  let directionInstruction = ""; // Instruction for the model regarding direction and style

  if (direction === "modern-to-ancient") {
    sourceLang =
      modernStyle === "katharevousa"
        ? "Καθαρεύουσα (Modern Greek formal style)"
        : "Νέα Ελληνικά (Modern Greek standard style)";
    targetLang = "Αρχαία Ελληνικά (Ancient Greek)";
    directionInstruction = `Translate the following text from ${sourceLang} to ${targetLang}.`;
  } else if (direction === "ancient-to-modern") {
    sourceLang = "Αρχαία Ελληνικά (Ancient Greek)";
    targetLang =
      modernStyle === "katharevousa"
        ? "Καθαρεύουσα (Modern Greek formal style)"
        : "Νέα Ελληνικά (Modern Greek standard style)";
    directionInstruction = `Translate the following text from ${sourceLang} to ${targetLang}.`;
  } else {
    console.error("Invalid direction received by Gemini route:", direction); // Keep your existing error log
    return NextResponse.json(
      // Keep your existing error response
      { error: "Invalid translation direction provided." },
      { status: 400 }
    );
  }

  const prompt = `${directionInstruction} Provide ONLY the translation and nothing else. Do not include any conversational text, explanations, or additional formatting. The text to translate is this: "${text}"`;

  try {
    const result = await model.generateContentStream(prompt);

    const { stream } = result;

    const responseStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        for await (const chunk of stream) {
          const chunkText = chunk.text();

          const jsonChunk = { response: chunkText };
          controller.enqueue(encoder.encode(JSON.stringify(jsonChunk) + "\n"));
        }

        const doneJson = { done: true };
        controller.enqueue(encoder.encode(JSON.stringify(doneJson) + "\n"));

        controller.close();
      },
    });

    return new NextResponse(responseStream, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (e: unknown) {
    console.error("Error calling Gemini API:", e);

    let errorMessage = "An unknown error occurred calling Gemini API";

    if (e instanceof Error) {
      errorMessage = `Error from Gemini API: ${e.message}`;
    } else if (typeof e === "string") {
      errorMessage = `Error from Gemini API: ${e}`;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

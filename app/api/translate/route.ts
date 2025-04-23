import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { text, direction,modernStyle } = await req.json();

  // Validate direction and determine language roles
  let sourceLang = "";
  let targetLang = "";
  let directionInstruction = ""; // Instruction for the model regarding direction and style

  if (direction === "modern-to-ancient") {
    sourceLang = (modernStyle === "katharevousa") ? "Καθαρεύουσα (Modern Greek formal style)" : "Νέα Ελληνικά (Modern Greek standard style)";
    targetLang = "Αρχαία Ελληνικά (Ancient Greek)";
    directionInstruction = `Translate the following text from ${sourceLang} to ${targetLang}.`;
  } else if (direction === "ancient-to-modern") {
    sourceLang = "Αρχαία Ελληνικά (Ancient Greek)";
     targetLang = (modernStyle === "katharevousa") ? "Καθαρεύουσα (Modern Greek formal style)" : "Νέα Ελληνικά (Modern Greek standard style)";
     directionInstruction = `Translate the following text from ${sourceLang} to ${targetLang}.`;
  } else {
    console.error("Invalid direction received:", direction);
    return NextResponse.json(
      { error: "Invalid translation direction provided." },
      { status: 400 }
    );
  }

  const prompt = `${directionInstruction} Provide ONLY the translation and nothing else. The text to translate is this: "${text}"`;
  console.log(prompt);

  try {
    const ollamaResponse = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "ilsp/meltemi-instruct",
        prompt: prompt,
        stream: true,
      }),
    });

    if (!ollamaResponse.ok || !ollamaResponse.body) {
      const errorBody = await ollamaResponse.text();
      console.error("Ollama API error:", ollamaResponse.status, errorBody);
      return NextResponse.json(
        {
          error: `Ollama API returned status ${ollamaResponse.status}: ${errorBody}`,
        },
        { status: ollamaResponse.status }
      );
    }

    return new NextResponse(ollamaResponse.body, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error: unknown) {
    console.error("Error calling Ollama API:", error);

    if (error instanceof Error) {
      if (
        error.message.includes("fetch failed") ||
        error.message.includes("ECONNREFUSED")
      ) {
        return NextResponse.json(
          {
            error:
              "Failed to connect to Ollama. Is it running and accessible at http://localhost:11434?",
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: `Translation request failed: ${error.message}` },
        { status: 500 }
      );
    }

    let errorMessage = "Translation request failed due to an unknown error";
    if (typeof error === "string") {
      errorMessage = `Translation request failed: ${error}`;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

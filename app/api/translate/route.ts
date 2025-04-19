import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { text, direction } = await req.json();

  let directionPrompt = "";
  if (direction === "modern-to-ancient") {
    directionPrompt = "from modern to ancient greek";
  } else if (direction === "ancient-to-modern") {
    directionPrompt = "from ancient to modern greek";
  } else {
    console.error("Invalid direction received:", direction);
    return NextResponse.json(
      { error: "Invalid translation direction provided." },
      { status: 400 }
    );
  }

  const prompt = `Translate ${directionPrompt}. Send only the translation. Text to translate is this":${text}"`;
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
  } catch (error: any) {
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
    return NextResponse.json(
      { error: "Translation request failed due to an unknown error" },
      { status: 500 }
    );
  }
}

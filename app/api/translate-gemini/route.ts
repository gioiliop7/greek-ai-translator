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

  const { text, direction } = await req.json();
  console.log("Gemini Translate Request - Direction:", direction);

  let directionPrompt = "";
  if (direction === "modern-to-ancient") {
    directionPrompt = "από νέα ελληνικά σε αρχαία ελληνικά";
  } else if (direction === "ancient-to-modern") {
    directionPrompt = "από αρχαία ελληνικά σε νέα ελληνικά";
  } else {
    console.error("Invalid direction received by Gemini route:", direction);
    return NextResponse.json(
      { error: "Invalid translation direction provided." },
      { status: 400 }
    );
  }

  const prompt = `Είσαι ένας εξειδικευμένος μεταφραστής. Μετάφρασε το παρακάτω κείμενο ${directionPrompt}. Δώσε μόνο τη μετάφραση και τίποτα άλλο, χωρίς επιπλέον σχόλια ή επεξηγήσεις.\n\nΚείμενο προς μετάφραση:\n${text}\n\nΜετάφραση:`;

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
  } catch (e: any) {
    console.error("Error calling Gemini API:", e);
    return NextResponse.json(
      { error: `Error from Gemini API: ${e.message || e}` },
      { status: 500 }
    );
  }
}

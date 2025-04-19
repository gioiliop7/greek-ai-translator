import { NextResponse } from "next/server";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

const DEEPSEEK_MODEL = "deepseek-chat";

export async function POST(request: Request) {
  try {
    const { text, direction } = await request.json();

    if (!text || !direction) {
      return NextResponse.json(
        { error: "Missing text or direction in request body" },
        { status: 400 }
      );
    }

    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;

    if (!deepseekApiKey) {
      console.error("DEEPSEEK_API_KEY environment variable not set.");
      return NextResponse.json(
        { error: "DeepSeek API key not configured on the server." },
        { status: 500 }
      );
    }
    const messages = [
      {
        role: "system",
        content:
          "You are a highly accurate Greek language translator. Translate between Modern Greek and Ancient Greek.",
      },
      {
        role: "user",
        content:
          direction === "modern-to-ancient"
            ? `Translate the following Modern Greek text to Ancient Greek:\n\n${text}. Send only the translated text.`
            : `Translate the following Ancient Greek text to Modern Greek:\n\n${text}. Send only the translated text`,
      },
    ];

    const apiResponse = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: messages,
        stream: true,
      }),
    });

    if (!apiResponse.ok) {
      const errorBody = await apiResponse.text();
      console.error("DeepSeek API error:", apiResponse.status, errorBody);
      return NextResponse.json(
        {
          error: `DeepSeek API returned error: ${apiResponse.status} - ${errorBody}`,
        },
        { status: apiResponse.status }
      );
    }
    const reader = apiResponse.body?.getReader();
    const decoder = new TextDecoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader!.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process lines (DeepSeek might use 'data: {...}\n\n' format like OpenAI/Ollama)
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep the last potentially incomplete line

          for (const line of lines) {
            if (!line.trim() || line.startsWith(":")) continue; // Ignore empty lines or comments

            // Remove 'data: ' prefix if it exists
            const jsonString = line.startsWith("data: ")
              ? line.substring(6)
              : line;

            if (jsonString === "[DONE]") {
              // Check for end signal
              controller.enqueue(
                encoder.encode(JSON.stringify({ done: true }) + "\n")
              );
              controller.close();
              return;
            }

            try {
              // Parse the JSON chunk
              const json: any = JSON.parse(jsonString); // Use any temporarily, or define a type for DeepSeek stream chunks

              // Extract the content (adjust based on DeepSeek's JSON structure)
              const content =
                json.choices?.[0]?.delta?.content || json.choices?.[0]?.text; // Check both 'delta.content' (chat) and 'text' (completion)

              if (content !== undefined) {
                // Send the content chunk to the frontend
                controller.enqueue(
                  encoder.encode(JSON.stringify({ response: content }) + "\n")
                );
              }
            } catch (parseError: unknown) {
              console.error(
                "Failed to parse DeepSeek stream chunk:",
                jsonString,
                parseError
              );
              // Decide how to handle parsing errors - might skip the chunk or send an error to frontend
            }
          }
        }

        // If the stream ended without a [DONE] signal, send done: true
        if (!controller.desiredSize) {
          // Check if controller is still open
          controller.enqueue(
            encoder.encode(JSON.stringify({ done: true }) + "\n")
          );
          controller.close();
        }
      },
      cancel(reason) {
        console.log("Stream cancelled by frontend:", reason);
        reader?.cancel(reason); // Cancel the reader if the frontend cancels
      },
    });

    const encoder = new TextEncoder(); // Needs to be here to be available inside ReadableStream

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err: unknown) {
    console.error("Error calling DeepSeek API:", err);

    let errorMessage = "An unknown error occurred calling DeepSeek API";

    if (err instanceof Error) {
      errorMessage = `DeepSeek API Error: ${err.message}`;
    } else if (typeof err === "string") {
      errorMessage = `DeepSeek API Error: ${err}`;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

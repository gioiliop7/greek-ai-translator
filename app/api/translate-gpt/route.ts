// app/api/translate-chatgpt/route.ts
import { NextResponse } from "next/server";

// Get OpenAI API Key from environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Define the OpenAI Chat Completions API endpoint
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

// Define the model to use (you can choose gpt-4o, gpt-4-turbo, gpt-3.5-turbo, etc.)
// Check OpenAI documentation for available models and their capabilities
const OPENAI_MODEL = "gpt-4o";

export async function POST(request: Request) {
  // Middleware has already checked the Origin header.
  // If you have implemented other checks in middleware (e.g., Bearer Token, Signed Requests),
  // they have already executed before the request reaches here.

  try {
    const { text, direction } = await request.json();

    // Basic validation for request body
    if (!text || !direction) {
      console.error("Missing text or direction in request body.");
      return NextResponse.json(
        { error: "Missing text or translation direction in request." },
        { status: 400 }
      );
    }

    // Check if the OpenAI API Key is configured on the backend
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY environment variable not set on backend.");
      return NextResponse.json(
        { error: "OpenAI API key not configured on the server." },
        { status: 500 }
      );
    }

    // Define the system message to instruct the model on its role
    const systemMessage = {
      role: "system",
      content:
        "You are a highly accurate Greek language translator. Translate the provided text precisely according to the user's specified direction.Provide ONLY the translation and nothing else.",
    };

    // Define the user message containing the text to translate and the specific direction request
    const userMessage = {
      role: "user",
      content:
        direction === "modern-to-ancient"
          ? `Translate this Modern Greek text to Ancient Greek:\n\n${text}`
          : `Translate this Ancient Greek text to Modern Greek:\n\n${text}`,
    };

    // Construct the messages array for the Chat Completions API
    const messages = [systemMessage, userMessage];

    // Call the OpenAI Chat Completions API
    const openaiResponse = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`, // <-- Use the OpenAI API Key for authentication
      },
      body: JSON.stringify({
        model: OPENAI_MODEL, // <-- Use the selected OpenAI model
        messages: messages, // <-- Use the messages array format
        stream: true, // <-- Request streaming response for incremental display
        // Add other parameters if needed (e.g., temperature, max_tokens, top_p)
        // temperature: 0.7, // Controls creativity (higher means more random)
        // max_tokens: 500, // Max length of the generated response
      }),
    });

    // Check for errors from the OpenAI API response itself
    if (!openaiResponse.ok || !openaiResponse.body) {
      const errorBody = await openaiResponse.text();
      console.error("OpenAI API error:", openaiResponse.status, errorBody);
      // Attempt to parse the error body if it's JSON (OpenAI often returns JSON errors)
      try {
        const errorJson = JSON.parse(errorBody);
        // Check for common OpenAI error structures like { error: { message: "..." } }
        if (errorJson.error && errorJson.error.message) {
          return NextResponse.json(
            { error: `OpenAI API error: ${errorJson.error.message}` },
            { status: openaiResponse.status }
          );
        }
      } catch (e) {
        // Ignore JSON parsing error if the body is not valid JSON
      }

      // Fallback error message if the body wasn't JSON or didn't have a standard error format
      return NextResponse.json(
        {
          error: `OpenAI API returned status ${openaiResponse.status}: <span class="math-inline">\{errorBody\.substring\(0, 200\)\}</span>{errorBody.length > 200 ? '...' : ''}`, // Truncate long error bodies
        },
        { status: openaiResponse.status }
      );
    }

    const reader = openaiResponse.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder(); // For encoding response chunks back to the frontend

    const readableStream = new ReadableStream({
      async start(controller) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break; // End of stream

          buffer += decoder.decode(value, { stream: true });

          // Process lines - OpenAI stream chunks are separated by '\n' and prefixed with 'data: '
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep the last potentially incomplete line in the buffer

          for (const line of lines) {
            if (!line.trim() || line.startsWith(":")) continue; // Ignore empty lines or comments

            // Remove 'data: ' prefix from the line
            const jsonString = line.startsWith("data: ")
              ? line.substring(6)
              : line;

            if (jsonString === "[DONE]") {
              // Check for the end signal from OpenAI
              // Send the end signal to the frontend in the expected format
              controller.enqueue(
                encoder.encode(JSON.stringify({ done: true }) + "\n")
              );
              controller.close(); // Close the stream to the frontend
              return; // Exit the start function
            }

            try {
              const json = JSON.parse(jsonString);

              // Extract the content (text) from the 'delta' field
              // The 'delta' contains the new token(s) added to the response
              const content = json.choices?.[0]?.delta?.content; // Access choices[0].delta.content

              // If content exists and is not null/undefined
              if (content !== undefined) {
                // Send the content chunk to the frontend in the expected format
                controller.enqueue(
                  encoder.encode(JSON.stringify({ response: content }) + "\n")
                );
              }
            } catch (parseError: unknown) {
              console.error(
                "Failed to parse OpenAI stream chunk:",
                jsonString,
                parseError
              );
              // Decide how to handle parsing errors - you might log it, skip the chunk, etc.
            }
          }
        }

        // If the stream ended unexpectedly without a [DONE] signal, send done: true as a fallback
        if (!controller.desiredSize) {
          // Check if controller is still open (i.e., not closed by [DONE])
          controller.enqueue(
            encoder.encode(JSON.stringify({ done: true }) + "\n")
          );
          controller.close(); // Close the stream to the frontend
        }
      },
      cancel(reason) {
        console.log("OpenAI stream cancelled by frontend:", reason);
        reader?.cancel(reason); // Cancel the OpenAI reader if the frontend cancels the stream
      },
    });

    // Return the processed readable stream to the frontend
    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream", // Keep text/event-stream for the frontend to process chunks
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err: unknown) {
    // Catch block for general errors during the fetch call setup or stream handling
    console.error("Error calling OpenAI API:", err);
    let errorMessage = "OpenAI API request failed.";
    if (err instanceof Error) {
      errorMessage = `OpenAI API Error: ${err.message}`;
      // Check for common network/connection errors
      if (
        err.message.includes("fetch failed") ||
        err.message.includes("ECONNREFUSED")
      ) {
        errorMessage = "Failed to connect to OpenAI API.";
      }
    } else if (typeof err === "string") {
      errorMessage = `OpenAI API Error: ${err}`;
    } else {
      errorMessage = `OpenAI API Error due to an unexpected issue.`;
    }
    // Return a JSON error response to the frontend
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

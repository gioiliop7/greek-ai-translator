import { NextResponse } from "next/server";
// You don't need to import the Ollama client here if you are using fetch directly for Ollama
// import Ollama from 'ollama';

// Find the address of the Ollama host from environment variables (for local dev / ollama provider)
const ollamaHost = process.env.OLLAMA_HOST || "http://localhost:11434";

// Get the Hugging Face API Key from environment variables (for production / HF provider)
const HF_API_KEY = process.env.HF_API_KEY;
// Define the specific model on Hugging Face you want to use
const HF_MODEL_ID = "ilsp/Meltemi-7B-v1"; // <-- This is the Meltemi model on Hugging Face
// Define the endpoint URL for the model on the Hugging Face Inference API (Text Generation)
const HF_API_URL = `https://api-inference.huggingface.co/models/${HF_MODEL_ID}`;

export async function POST(req: Request) {
  const { text, direction, model } = await req.json();

  // Check if we are in the production environment
  const isProduction = process.env.NODE_ENV === "development";
  // We will use Hugging Face if in production
  const useHuggingFace = isProduction;

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

  const promptContent = `Translate ${directionPrompt}. Send only the translation. Text to translate is this":${text}"`;
  console.log("Prompt:", promptContent);

  if (useHuggingFace) {
    // Check if the HF API Key is configured
    if (!HF_API_KEY) {
      console.error("HF_API_KEY environment variable not set in production.");
      return NextResponse.json(
        {
          error:
            "Hugging Face API key not configured on the server for production.",
        },
        { status: 500 }
      );
    }

    try {
      // Call the Hugging Face Inference API for Text Generation
      const hfResponse = await fetch(HF_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${HF_API_KEY}`, // <-- Use the HF API Key
          // For streaming, check the HF Inference API documentation if specific headers are needed
          Accept: "text/event-stream", // Often needed for event-stream
        },
        body: JSON.stringify({
          inputs: promptContent, // <-- Hugging Face Text Generation API uses 'inputs'
          parameters: {
            // Add parameters as needed, check the HF Text Generation documentation
            // max_new_tokens: 500, // Max response length (adjust as needed)
            // temperature: 0.7, // Creativity (0-1)
            // do_sample: true, // Enable sampling (for temperature > 0)
            return_full_text: false, // Important: Request only the generated text, not the prompt + generated text
            wait_for_model: true, // Optional: Wait if the model is loading (can take time)
          },
          stream: true,
        }),
      });

      // Check for errors from the Hugging Face API
      if (!hfResponse.ok || !hfResponse.body) {
        const errorBody = await hfResponse.text();
        console.error("Hugging Face API error:", hfResponse.status, errorBody);
        // Attempt to parse the error body if it's JSON (HF often returns JSON errors)
        try {
          const errorJson = JSON.parse(errorBody);
          // Check for common HF error structures like { error: "..." } or { error: { code: ..., message: ... } }
          if (errorJson.error) {
            // If the error object has a 'message' field
            if (
              typeof errorJson.error === "object" &&
              errorJson.error.message
            ) {
              return NextResponse.json(
                { error: `Hugging Face API error: ${errorJson.error.message}` },
                { status: hfResponse.status }
              );
            }
            // If the error is a simple string
            if (typeof errorJson.error === "string") {
              return NextResponse.json(
                { error: `Hugging Face API error: ${errorJson.error}` },
                { status: hfResponse.status }
              );
            }
          }
        } catch (e) {
          // Ignore JSON parsing error if the body is not valid JSON
        }

        // Fallback error message if the body wasn't JSON or didn't have a standard error format
        return NextResponse.json(
          {
            error: `Hugging Face API returned status ${
              hfResponse.status
            }: ${errorBody.substring(0, 200)}${
              errorBody.length > 200 ? "..." : ""
            }`, // Truncate long error bodies
          },
          { status: hfResponse.status }
        );
      }

      const reader = hfResponse.body.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder(); // For encoding response chunks

      const readableStream = new ReadableStream({
        async start(controller) {
          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Process lines - HF uses 'data: {...}\n\n'
            const lines = buffer.split("\n");
            buffer = lines.pop() || ""; // Keep the last potentially incomplete line

            for (const line of lines) {
              if (!line.trim() || line.startsWith(":")) continue; // Ignore empty lines or comments

              // Remove 'data: ' prefix
              const jsonString = line.startsWith("data: ")
                ? line.substring(6)
                : line;

              if (jsonString === "[DONE]") {
                // Check for the end signal from HF
                // Send the end signal to the frontend in the expected format
                controller.enqueue(
                  encoder.encode(JSON.stringify({ done: true }) + "\n")
                );
                controller.close();
                return;
              }

              try {
                const json: any = JSON.parse(jsonString);

                // Extract the content (the text of the token)
                const content = json.token?.text; // Access token.text

                if (content !== undefined) {
                  // Send the content chunk to the frontend in the expected format
                  controller.enqueue(
                    encoder.encode(JSON.stringify({ response: content }) + "\n")
                  );
                }
              } catch (parseError: unknown) {
                console.error(
                  "Failed to parse Hugging Face stream chunk:",
                  jsonString,
                  parseError
                );
                // Decide how to handle parsing errors - you might skip the chunk or log it
              }
            }
          }

          // If the stream ended without a [DONE] signal, send done: true as a fallback
          if (!controller.desiredSize) {
            // Check if controller is still open
            controller.enqueue(
              encoder.encode(JSON.stringify({ done: true }) + "\n")
            );
            controller.close();
          }
        },
        cancel(reason) {
          console.log("Hugging Face stream cancelled by frontend:", reason);
          reader?.cancel(reason); // Cancel the HF reader if the frontend cancels the stream
        },
      });

      // Return the processed stream to the frontend
      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/event-stream", // Keep text/event-stream for the frontend
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } catch (error: unknown) {
      console.error("Error calling Hugging Face API:", error);
      // Handle errors specifically for the HF call attempt
      let errorMessage = "Hugging Face API request failed.";
      if (error instanceof Error) {
        errorMessage = `Hugging Face API Error: ${error.message}`;
        // Check for common network errors
        if (
          error.message.includes("fetch failed") ||
          error.message.includes("ECONNREFUSED")
        ) {
          errorMessage = "Failed to connect to Hugging Face API.";
        }
      } else if (typeof error === "string") {
        errorMessage = `Hugging Face API Error: ${error}`;
      } else {
        errorMessage = `Hugging Face API Error due to an unexpected issue.`;
      }
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  } else {
    // --- Development Logic: Use Local Ollama ---
    const ollamaModelToUse = model || "ilsp/meltemi-instruct"; // Use model from frontend if sent, otherwise default

    try {
      // Make the fetch call to the local Ollama instance
      // Using the /api/generate endpoint as in your original code
      const ollamaResponse = await fetch(`${ollamaHost}/api/generate`, {
        // Use the ollamaHost
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: ollamaModelToUse, // <-- Use the determined model name
          prompt: promptContent, // <-- Use the constructed promptContent
          stream: true,
          // Add other Ollama parameters if needed (e.g., temperature, num_predict)
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

      // --- Handle Streaming Response from Ollama ---

      const reader = ollamaResponse.body.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();

      const readableStream = new ReadableStream({
        async start(controller) {
          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n");
            buffer = lines.pop() || ""; // Keep the last potentially incomplete line

            for (const line of lines) {
              if (!line.trim()) continue;

              try {
                // Parse the JSON chunk from Ollama
                // Use 'any' temporarily or define a type for Ollama stream chunks if you need stronger typing
                const json: any = JSON.parse(line);

                // The format of Ollama's generate stream typically has a 'response' field
                if (json.response !== undefined) {
                  controller.enqueue(
                    encoder.encode(
                      JSON.stringify({ response: json.response }) + "\n"
                    )
                  );
                }
                // Some Ollama endpoints send {done: true} at the end, but 'generate' might not always.
                // We rely on the reader.read() done signal to indicate the end of the stream.
              } catch (parseError: unknown) {
                console.error(
                  "Failed to parse Ollama stream chunk:",
                  line,
                  parseError
                );
                // Decide how to handle parsing errors - you might skip the chunk
              }
            }
          }
          // Send the done signal when the stream is completely finished
          controller.enqueue(
            encoder.encode(JSON.stringify({ done: true }) + "\n")
          );
          controller.close();
        },
        cancel(reason) {
          console.log("Ollama stream cancelled by frontend:", reason);
          reader?.cancel(reason); // Cancel the Ollama reader if the frontend cancels the stream
        },
      });

      // Return the processed stream to the frontend
      return new Response(readableStream, {
        headers: {
          "Content-Type": "text/event-stream", // Keep text/event-stream
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } catch (error: unknown) {
      // Error handling for Ollama (already present)
      console.error("Error calling Ollama API:", error);

      let errorMessage = "Ollama request failed.";
      if (error instanceof Error) {
        // Handle specific fetch/connection errors
        if (
          error.message.includes("fetch failed") ||
          error.message.includes("ECONNREFUSED") ||
          (ollamaHost && error.message.includes(ollamaHost)) // Check for the host in the error message
        ) {
          errorMessage = `Failed to connect to Ollama at ${ollamaHost}. Is it running and accessible? Check backend logs.`;
        } else {
          errorMessage = `Ollama request failed: ${error.message}`;
        }
      } else if (typeof error === "string") {
        errorMessage = `Ollama request failed: ${error}`;
      } else {
        errorMessage = `Ollama request failed due to an unexpected issue.`;
      }

      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  }
}

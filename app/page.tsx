"use client";

import { useState, useEffect, useRef } from "react"; // Added useRef
import {
  ArrowRightLeft,
  Loader2,
  Cpu,
  Cloud,
  History,
  Check,
  Sparkles,
  Moon,
  Sun,
  ClipboardCopy, // For copying
  Download, // For file download
  X, // For clearing input
  Mic, // For voice input
  MessageCircle, // For feedback (placeholder)
} from "lucide-react";
import { Window, TranslationHistoryItem } from "@/helpers/types";
import Disclaimer from "@/components/Disclaimer";

export default function Home() {
  const [text, setText] = useState("");
  const [translated, setTranslated] = useState("");
  const [direction, setDirection] = useState<
    "modern-to-ancient" | "ancient-to-modern"
  >("modern-to-ancient");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<
    "ollama" | "gemini" | "deepsick" | "chatgpt"
  >("ollama");
  const [history, setHistory] = useState<TranslationHistoryItem[]>([]); // Using the interface
  const [showHistory, setShowHistory] = useState(false);
  const [darkMode, setDarkMode] = useState(true); // Default dark mode
  const [copied, setCopied] = useState(false);
  const [characterCount, setCharacterCount] = useState(0);
  const [copyTooltip, setCopyTooltip] = useState(false);
  const [isSpeechApiSupported, setIsSpeechApiSupported] = useState(false); // <-- New state for voice
  const [isListening, setIsListening] = useState(false); // <-- New state for listening status
  const recognitionRef = useRef<SpeechRecognition | null>(null); // <-- Ref for SpeechRecognition API
  const inputTextAreaRef = useRef<HTMLTextAreaElement>(null); // <-- Ref for input textarea (for drag/drop)
  // Add states for history search and filter
  const [historySearchQuery, setHistorySearchQuery] = useState(""); // State for the search input text
  const [historyFilter, setHistoryFilter] = useState<"all" | "favorites">(
    "all"
  ); // State for the filter (show all or only favorites)

  // 1. History with localStorage
  useEffect(() => {
    // Load history from localStorage on component mount
    const savedHistory = localStorage.getItem("translationHistory");
    if (savedHistory) {
      try {
        // Parse the JSON string into an array of history items
        const parsedHistory: TranslationHistoryItem[] =
          JSON.parse(savedHistory);

        // Map over the parsed history to ensure the 'isFavorite' property exists
        // This handles loading old history items saved before 'isFavorite' was added
        const historyWithFavorites = parsedHistory.map((item) => ({
          ...item, // Copy existing properties
          isFavorite: item.isFavorite ?? false, // Use existing isFavorite or default to false if undefined/null
        }));

        setHistory(historyWithFavorites); // Update the history state
      } catch (e) {
        console.error("Failed to parse history from localStorage", e);
        // Clear potentially corrupted history if parsing fails
        localStorage.removeItem("translationHistory");
      }
    }
    // No dependencies needed, runs only once on mount
  }, []); // Empty dependency array

  useEffect(() => {
    // Save history to localStorage whenever it changes
    try {
      localStorage.setItem("translationHistory", JSON.stringify(history));
    } catch (e) {
      console.error("Failed to save history to localStorage:", e);
      // Can happen if history becomes too large and exceeds localStorage limit
    }
  }, [history]); // This useEffect runs every time history state changes

  // Character Count
  useEffect(() => {
    setCharacterCount(text.length);
  }, [text]);

  // 6. Disable Ollama in Production
  const isProduction = process.env.NODE_ENV === "production";
  useEffect(() => {
    if (isProduction && provider === "ollama") {
      // If we're in production and provider is Ollama, switch to Gemini
      setProvider("gemini");
      // You can show an alert or message to the user the first time
      // alert("Ollama model is disabled in production environment.");
    }
  }, [isProduction, provider]); // Checks when environment or provider changes

  // 3. Speech-to-Text (Voice Input)
  // --- 3. Speech-to-Text (Voice Input) ---
  useEffect(() => {
    // Check for Web Speech API support
    // Accessing SpeechRecognition via window requires checking if window is defined (for SSR safety)
    const SpeechRecognition =
      typeof window !== "undefined"
        ? (window as unknown as Window).SpeechRecognition ||
          (window as unknown as Window).webkitSpeechRecognition
        : undefined;

    if (SpeechRecognition) {
      setIsSpeechApiSupported(true);
      try {
        // Initialize SpeechRecognition - Specify the type
        const recognition: SpeechRecognition = new SpeechRecognition();
        recognition.continuous = false; // Changed to false for single utterance recognition on button press
        recognition.interimResults = true; // Keep interim results for potentially showing live text
        recognition.lang = "el-GR"; // Recognition language (Greek)

        // Specify event type
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interimTranscript = "";
          let finalTranscript = "";
          // Loop through results to separate final and interim
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const result = event.results[i];
            if (result.isFinal) {
              finalTranscript += result[0].transcript;
            } else {
              interimTranscript += result[0].transcript;
            }
          }
          // Append *final* recognized text to the input field
          if (finalTranscript.trim()) {
            // Add a space before appending if the input text is not empty
            setText(
              (prevText) =>
                prevText +
                (prevText.endsWith(" ") || prevText.length === 0 ? "" : " ") +
                finalTranscript
            );
          }
          // You could potentially display interimTranscript somewhere else, e.g., a temporary status area
          console.log("Interim:", interimTranscript);
        };

        // Specify event type
        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false); // Stop listening state in case of error
          // event.error contains the error type string (e.g., 'not-allowed', 'no-speech')
          setError(`Σφάλμα φωνητικής αναγνώρισης: ${event.error}`);
        };

        recognition.onend = () => {
          // This is called when recognition stops (manually or automatically)
          setIsListening(false);
          console.log("Speech recognition ended.");
        };

        recognitionRef.current = recognition; // Store instance in ref
      } catch (e) {
        console.error("Error initializing SpeechRecognition:", e);
        setIsSpeechApiSupported(false); // If initialization itself fails
      }
    } else {
      setIsSpeechApiSupported(false);
      console.warn("Web Speech API not supported in this browser.");
    }

    // Cleanup function to stop recognition if component unmounts or effect re-runs (though dependency array is empty)
    return () => {
      // Use the ref directly in cleanup
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        // Avoid setting state in cleanup if not absolutely necessary,
        // onend will handle setIsListening(false)
      }
    };
  }, []); // Empty dependency array ensures this runs only once

  const toggleListening = () => {
    if (!isSpeechApiSupported) {
      setError("Voice input is not supported by your browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop(); // Stop recognition
      setIsListening(false);
      console.log("Stopped listening.");
    } else {
      setError(null); // Clear previous errors
      // You may need to clear input text if you want new dictation
      // setText(''); // Optional: clear input before new dictation
      recognitionRef.current?.start(); // Start recognition
      setIsListening(true);
      console.log("Started listening...");
    }
  };

  // 10. Drag and Drop (for .txt files)
  useEffect(() => {
    const inputArea = inputTextAreaRef.current?.parentElement; // Connect drag/drop to container

    if (inputArea) {
      const handleDragOver = (e: DragEvent) => {
        e.preventDefault(); // Prevent default to allow drop
        // Add visual feedback (optional)
        inputArea.classList.add(
          darkMode ? "border-blue-400" : "border-blue-600"
        );
        inputArea.classList.add("border-dashed");
      };

      const handleDragLeave = (e: DragEvent) => {
        e.preventDefault();
        // Remove visual feedback
        inputArea.classList.remove(
          darkMode ? "border-blue-400" : "border-blue-600"
        );
        inputArea.classList.remove("border-dashed");
      };

      const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        // Remove visual feedback
        inputArea.classList.remove(
          darkMode ? "border-blue-400" : "border-blue-600"
        );
        inputArea.classList.remove("border-dashed");

        const files = e.dataTransfer?.files;

        if (files && files.length > 0) {
          const file = files[0]; // Get first file

          // Check if it's a text file (.txt)
          if (file.type === "text/plain" || file.name.endsWith(".txt")) {
            setError(null); // Clear previous errors
            const reader = new FileReader();

            reader.onload = (event) => {
              const fileContent = event.target?.result as string;
              setText(fileContent); // Put content in input textarea
            };

            reader.onerror = (event) => {
              console.error("Error reading file:", event.target?.error);
              setError("Error reading file.");
            };

            reader.readAsText(file); // Read file as text
          } else {
            setError("Please upload only text files (.txt).");
            console.warn(
              "Dropped file is not a .txt file:",
              file.type,
              file.name
            );
          }
        }
      };

      // Add Event Listeners
      inputArea.addEventListener("dragover", handleDragOver);
      inputArea.addEventListener("dragleave", handleDragLeave);
      inputArea.addEventListener("drop", handleDrop);

      // Cleanup: Remove Event Listeners when component unmounts
      return () => {
        inputArea.removeEventListener("dragover", handleDragOver);
        inputArea.removeEventListener("dragleave", handleDragLeave);
        inputArea.removeEventListener("drop", handleDrop);
      };
    }
    return () => {}; // Return empty function for cleanup if inputArea not found
  }, [darkMode]); // Re-run if darkMode changes for border classes

  // --- Derived State for Filtered History ---
  // This state is computed whenever history, search query, or filter changes
  const filteredHistory = history.filter((item) => {
    // Filter by search query (case-insensitive, check input text)
    const matchesSearch = item.input
      .toLowerCase()
      .includes(historySearchQuery.toLowerCase());

    // Filter by favorite status
    const matchesFilter =
      historyFilter === "all" ||
      (historyFilter === "favorites" && item.isFavorite);

    // An item is included if it matches both search and filter
    return matchesSearch && matchesFilter;
  });

  const handleTranslate = async () => {
    if (!text.trim()) {
      setError("Please enter text for translation.");
      return;
    }

    // Check if Ollama is selected in production environment
    if (isProduction && provider === "ollama") {
      setError(
        "Ollama model is disabled in production environment. Please select Gemini API."
      );
      return; // Stop translation
    }

    setLoading(true);
    setTranslated("");
    setError(null);

    // Determine the API route and the model name (modelName only for Ollama)
    let apiRoute: string;

    if (provider === "ollama") {
      apiRoute = "/api/translate"; // This route handles Ollama
    } else if (provider === "gemini") {
      apiRoute = "/api/translate-gemini"; // This route handles Gemini
    } else if (provider === "deepsick") {
      apiRoute = "/api/translate-deepsick";
    } else if (provider === "chatgpt") {
      apiRoute = "/api/translate-gpt";
    } else {
      setError("Μη υποστηριζόμενος πάροχος.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(apiRoute, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, direction }),
      });

      if (!res.ok) {
        const errorBody = await res.text();
        console.error("Backend API error:", res.status, errorBody);
        throw new Error(
          `API error: ${res.status} ${res.statusText} - ${errorBody}`
        );
      }

      if (!res.body) {
        throw new Error("Response body is empty. Expected a stream.");
      }

      // --- Stream handling logic remains the same ---
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let isDone = false;
      let translatedText = "";

      while (!isDone) {
        const { done, value } = await reader.read();

        if (done) {
          isDone = true;
          if (buffer.trim()) {
            console.warn("Stream ended, but buffer contains data:", buffer);
          }
        }

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const json = JSON.parse(line);

            if (json.response !== undefined) {
              translatedText += json.response;
              setTranslated(translatedText);
            }

            if (json.done === true) {
              isDone = true;
              reader.cancel();
              break;
            }
          } catch (parseError) {
            console.error("Failed to parse JSON line:", line, parseError);
          }
        }
      }

      if (buffer.trim()) {
        try {
          const json = JSON.parse(buffer);
          if (json.response !== undefined) {
            translatedText += json.response;
            setTranslated(translatedText);
          }
        } catch (parseError) {
          console.error(
            "Failed to parse remaining buffer as JSON:",
            buffer,
            parseError
          );
        }
      }

      // Add to history only after the translation is fully received
      // Convert direction and provider to readable strings for history
      const historyDirection =
        direction === "modern-to-ancient" ? "Νέα → Αρχαία" : "Αρχαία → Νέα";
      const historyProvider: "Ollama" | "Gemini" | "DeepSeek" | "ChatGPT" = // <-- Update type
        provider === "ollama"
          ? "Ollama"
          : provider === "gemini"
          ? "Gemini"
          : provider === "deepsick"
          ? "DeepSeek"
          : "ChatGPT"; // <-- Add ChatGPT case

      setHistory((prev) => [
        {
          input: text,
          output: translatedText,
          direction: historyDirection,
          provider: historyProvider,
          timestamp: Date.now(), // Add timestamp
          isFavorite: false,
        },
        ...prev.slice(0, 9), // Keep only last 10 translations
      ]);
    } catch (err: unknown) {
      // Use unknown for catch error
      console.error("General translation error:", err);
      // Safely access error message based on type
      if (err instanceof Error) {
        setError(err.message || "An unknown error occurred.");
      } else if (typeof err === "string") {
        setError(err);
      } else {
        setError("An unknown error occurred.");
      }
      setTranslated("");
    } finally {
      setLoading(false);
      // Cleanup is handled by the useEffect cleanup function for SpeechRecognition
    }
  };

  // Function to toggle the favorite status of a history item
  const toggleFavorite = (timestamp: number) => {
    setHistory((prevHistory) =>
      prevHistory.map((item) =>
        item.timestamp === timestamp
          ? { ...item, isFavorite: !item.isFavorite }
          : item
      )
    );
    // The useEffect that saves history will automatically save the updated state
  };

  const toggleDirection = () => {
    const newDirection =
      direction === "modern-to-ancient"
        ? "ancient-to-modern"
        : "modern-to-ancient";
    setDirection(newDirection);

    // Swap text areas and clear translation on direction change
    const currentInput = text;
    const currentTranslated = translated;
    setText(currentTranslated);
    setTranslated(currentInput); // <-- Swap translated text to input on direction change
    setError(null);
  };

  // 2. Input Text Clear Button
  const clearInputText = () => {
    setText("");
    setTranslated(""); // Clear translation too
    setError(null); // Clear error
    // Optional: stop listening if active
    if (isListening) {
      toggleListening();
    }
  };

  // Copy to Clipboard functionality (remains the same)
  const copyToClipboard = () => {
    if (translated) {
      navigator.clipboard.writeText(translated);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  };

  // Copy input text functionality (remains the same)
  const copyInputText = () => {
    if (text) {
      navigator.clipboard.writeText(text);
      setCopyTooltip(true);
      setTimeout(() => setCopyTooltip(false), 2000);
    }
  };

  // Download translation as text file (remains the same)
  const downloadTranslation = () => {
    if (translated) {
      const element = document.createElement("a");
      const file = new Blob([translated], { type: "text/plain" });
      element.href = URL.createObjectURL(file);

      const directionText =
        direction === "modern-to-ancient"
          ? "modern-to-ancient"
          : "ancient-to-modern";
      element.download = `greek-translation-${directionText}-${new Date()
        .toISOString()
        .slice(0, 10)}.txt`;

      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  // Load from History (updated to handle new history item structure)
  const loadFromHistory = (item: TranslationHistoryItem) => {
    setText(item.input);
    setTranslated(item.output);
    // Restore direction based on stored value
    setDirection(
      item.direction === "Νέα → Αρχαία"
        ? "modern-to-ancient"
        : "ancient-to-modern"
    );
    // Restore provider based on stored value
    setProvider(
      item.provider.toLowerCase() as
        | "ollama"
        | "gemini"
        | "deepsick"
        | "chatgpt"
    );
    setShowHistory(false);
    setError(null); // Clear errors
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("translationHistory"); // Clear from localStorage too
    setShowHistory(false);
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  const inputLabel =
    direction === "modern-to-ancient"
      ? "Κείμενο (Νέα Ελληνικά)"
      : "Κείμενο (Αρχαία Ελληνικά)";
  const outputLabel =
    direction === "modern-to-ancient"
      ? "Μετάφραση (Αρχαία Ελληνικά)"
      : "Μετάφραση (Νέα Ελληνικά)";

  // Dynamic theme classes
  const themeClasses = darkMode
    ? "bg-gradient-to-br from-gray-900 to-black text-white"
    : "bg-gradient-to-br from-blue-50 to-white text-gray-900";

  const cardClasses = darkMode
    ? "bg-gray-800/50 backdrop-blur-lg border-gray-700"
    : "bg-white/70 backdrop-blur-lg border-gray-200";

  const inputBgClasses = darkMode
    ? "bg-gray-700/50 border-gray-600 text-white placeholder-gray-500"
    : "bg-gray-100/80 border-gray-300 text-gray-800 placeholder-gray-400";

  const buttonGradient = darkMode
    ? "bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700"
    : "bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600";

  const secondaryButtonClasses = darkMode
    ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
    : "bg-gray-200 hover:bg-gray-300 text-gray-700";

  const tooltipClasses = darkMode
    ? "bg-gray-700 text-white"
    : "bg-gray-100 text-gray-800";

  const actionButtonClasses = darkMode
    ? "bg-blue-600/20 hover:bg-blue-500/30 text-blue-400 border-blue-700/30"
    : "bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-200";

  return (
    <main
      className={`min-h-screen ${themeClasses} p-6 flex flex-col items-center py-12 transition-colors duration-300`}
    >
      <div
        className={`w-full max-w-5xl ${cardClasses} rounded-3xl shadow-2xl border p-8 space-y-8 transition-colors duration-300`}
      >
        <div className="flex-col md:flex-row flex justify-between items-center">
          <h1 className="text-4xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-500">
            Lexi AI
          </h1>

          {/* Top Action Buttons */}
          <div className="flex gap-3">
            {/* History Button */}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-3 ${secondaryButtonClasses} rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500`}
              aria-label="Translation history"
            >
              <History
                className={darkMode ? "text-blue-400" : "text-blue-600"}
                size={20}
              />
            </button>

            {/* 12. Feedback Placeholder Button */}
            <button
              // onClick={} // To be developed
              className={`p-3 ${secondaryButtonClasses} rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500`}
              aria-label="Provide feedback"
              title="Feedback (Under development)"
            >
              <MessageCircle
                className={darkMode ? "text-yellow-400" : "text-yellow-600"}
                size={20}
              />
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className={`p-3 ${secondaryButtonClasses} rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500`}
              aria-label="Toggle theme"
            >
              {darkMode ? (
                <Sun className="text-yellow-400" size={20} />
              ) : (
                <Moon className="text-blue-600" size={20} />
              )}
            </button>
          </div>
        </div>

        <p className="text-center text-lg">
          <span className="font-semibold">Μεταφραστής</span> Αρχαίων/Νέων
          Ελληνικών
        </p>

        <div
          className={`text-lg font-semibold text-center ${
            darkMode ? "text-gray-300" : "text-gray-700"
          }`}
        >
          Επιλογή Μοντέλου
        </div>

        {/* Provider Selection */}
        <div className="flex flex-wrap items-center justify-center gap-6 mb-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex items-center gap-3">
              <input
                type="radio"
                id="provider-chatgpt" // <-- Unique ID for ChatGPT radio button
                name="provider" // <-- Use the same name for the group
                value="chatgpt" // <-- Value to set the state
                checked={provider === "chatgpt"} // <-- Checked if this provider is selected
                onChange={() => setProvider("chatgpt")} // <-- Update provider state on change
                className="form-radio h-5 w-5 accent-green-500" // <-- Choose an accent color (e.g., green)
                disabled={loading}
              />
              <label
                htmlFor="provider-chatgpt" // <-- Link label to input ID
                className={`flex items-center ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                } cursor-pointer`}
              >
                <Cloud // Or Sparkles, or a custom icon you prefer for OpenAI/ChatGPT
                  className={`mr-2 ${
                    darkMode ? "text-green-400" : "text-green-600"
                  }`} // <-- Icon color
                  size={20}
                />
                <span>ChatGPT</span> {/* <-- Label text */}
                <span
                  className={`ml-2 px-2 py-1 text-xs rounded-full text-green-300 ${
                    darkMode ? "bg-green-700" : "bg-green-900"
                  }`}
                >
                  Cloud
                </span>
              </label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="radio"
                id="provider-ollama"
                name="provider"
                value="ollama"
                checked={provider === "ollama"}
                onChange={() => setProvider("ollama")}
                className={`form-radio h-5 w-5 accent-blue-500`}
                disabled={loading || isProduction} // <-- Disable in production
              />
              <label
                htmlFor="provider-ollama"
                className={`flex items-center ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                } cursor-pointer ${
                  isProduction ? "opacity-50 cursor-not-allowed" : ""
                }`} // <-- Visual cue for disabled
              >
                <Cpu
                  className={`mr-2 ${
                    darkMode ? "text-blue-400" : "text-blue-600"
                  }`}
                  size={20}
                />
                <span>Ollama</span>
                <span
                  className={`ml-2 px-2 py-1 text-xs rounded-full text-blue-300 ${
                    darkMode ? "bg-blue-700" : "bg-blue-900"
                  }`}
                >
                  Local
                </span>
                {/* <-- Text cue */}
              </label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="radio"
                id="provider-gemini"
                name="provider"
                value="gemini"
                checked={provider === "gemini"}
                onChange={() => setProvider("gemini")}
                className="form-radio h-5 w-5 accent-violet-500"
                disabled={loading}
              />
              <label
                htmlFor="provider-gemini"
                className={`flex items-center ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                } cursor-pointer`}
              >
                <Cloud
                  className={`mr-2 ${
                    darkMode ? "text-violet-400" : "text-violet-600"
                  }`}
                  size={20}
                />
                <span>Gemini AI</span>
                <span
                  className={`ml-2 px-2 py-1 text-xs rounded-full text-violet-300 ${
                    darkMode ? "bg-violet-700" : "bg-violet-900"
                  }`}
                >
                  Cloud
                </span>
              </label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="radio"
                id="provider-deepsick" // <-- New ID
                name="provider"
                value="deepsick" // <-- New value
                checked={provider === "deepsick"}
                onChange={() => setProvider("deepsick")} // <-- Update provider state
                className="form-radio h-5 w-5 accent-cyan-500" // <-- Choose an accent color
                disabled={loading || isProduction}
              />
              <label
                htmlFor="provider-deepsick"
                className={`flex items-center ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                } cursor-pointer`}
              >
                <Cloud // Or another icon you prefer (Cloud ταιριάζει για API)
                  className={`mr-2 ${
                    darkMode ? "text-cyan-400" : "text-cyan-600"
                  }`} // <-- Icon color
                  size={20}
                />
                <span>DeepSeek AI</span> {/* <-- New label text */}
                <span
                  className={`ml-2 px-2 py-1  text-xs rounded-full text-cyan-300 ${
                    darkMode ? "bg-cyan-700" : "bg-cyan-900"
                  }`}
                >
                  Cloud
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Direction Toggle */}
        <div className="flex items-center justify-center gap-4 py-2">
          <span
            className={`text-lg font-semibold ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            {direction === "modern-to-ancient"
              ? "Νέα Ελληνικά"
              : "Αρχαία Ελληνικά"}
          </span>
          <button
            onClick={toggleDirection}
            className={`p-3 ${secondaryButtonClasses} rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500`}
            aria-label="Change Translation Direction"
            disabled={loading}
          >
            <ArrowRightLeft
              className={darkMode ? "text-blue-400" : "text-blue-600"}
              size={20}
            />
          </button>
          <span
            className={`text-lg font-semibold ${
              darkMode ? "text-gray-300" : "text-gray-700"
            }`}
          >
            {direction === "modern-to-ancient"
              ? "Αρχαία Ελληνικά"
              : "Νέα Ελληνικά"}
          </span>
        </div>

        {/* Translation Interface */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Input */}
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-3">
              <label
                htmlFor="inputText"
                className={`block ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                } text-lg font-medium`}
              >
                {inputLabel}:
                <span className="text-sm font-normal ml-2">
                  {characterCount > 0 && `(${characterCount} characters)`}
                </span>
              </label>

              {/* Input text actions */}
            </div>

            <div className="flex items-center gap-2 mb-4 flex-col md:flex-row">
              {/* 3. Voice Input Button */}
              {isSpeechApiSupported && (
                <button
                  onClick={toggleListening}
                  className={`p-2 ${
                    isListening
                      ? darkMode
                        ? "bg-red-600/30 text-red-400"
                        : "bg-red-200 text-red-700"
                      : secondaryButtonClasses
                  } rounded-lg text-sm flex items-center gap-1 transition-colors duration-200`}
                  aria-label={
                    isListening ? "Stop voice input" : "Start voice input"
                  }
                  title={isListening ? "Stop dictation" : "Start dictation"}
                  disabled={loading} // Can't dictate while translating
                >
                  {isListening ? (
                    <Loader2 size={16} className="animate-spin text-red-500" /> // Spinner when listening
                  ) : (
                    <Mic
                      size={16}
                      className={darkMode ? "text-blue-400" : "text-blue-600"}
                    />
                  )}
                  <span>{isListening ? "Ακούω..." : "Φωνητική Αναζήτηση"}</span>
                </button>
              )}

              {/* 2. Clear Input Button */}
              {text && ( // Show only if there's text
                <button
                  onClick={clearInputText}
                  className={`p-2 ${secondaryButtonClasses} rounded-lg text-sm flex items-center gap-1 transition-colors duration-200`}
                  aria-label="Clear input text"
                  title="Clear"
                >
                  <X
                    size={16}
                    className={darkMode ? "text-red-400" : "text-red-600"}
                  />
                  <span>Καθαρισμός</span>
                </button>
              )}

              {/* Input text copy button (moved into action group) */}
              {text && (
                <div className="relative">
                  {" "}
                  {/* Keep relative for tooltip positioning */}
                  <button
                    onClick={copyInputText}
                    className={`p-2 ${secondaryButtonClasses} rounded-lg text-sm flex items-center gap-1 transition-colors duration-200`}
                    aria-label="Copy input text"
                  >
                    <ClipboardCopy
                      size={16}
                      className={darkMode ? "text-blue-400" : "text-blue-600"}
                    />
                    <span>Αντιγραφή</span>
                  </button>
                  {copyTooltip && (
                    <div
                      className={`absolute right-0 top-full mt-2 px-3 py-1 rounded-md text-sm shadow-lg ${tooltipClasses} z-10`}
                    >
                      Copied!
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input Textarea - with Drag and Drop */}
            <div // <-- Wrapper div for drag and drop
              //@ts-expect-error Ref
              ref={inputTextAreaRef} // <-- Attach ref here
              className={`relative flex-grow rounded-xl ${inputBgClasses} border transition-colors duration-200 ease-in-out overflow-hidden ${
                loading ? "opacity-70" : ""
              }`}
              // We don't add onDragOver/onDrop here, handle them with addEventListener in useEffect
              // You can add class for visual feedback during dragover
            >
              <textarea
                id="inputText"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Πληκτρολόγησε εδώ ή τοποθέτησε ένα .txt αρχείο για να στείλεις το κειμενό σου" // <-- Updated placeholder
                className={`w-full h-full p-4 bg-transparent text-lg placeholder-gray-500 resize-none overflow
                  loading ? "cursor-progress" : ""
                }`}
                disabled={loading}
              ></textarea>
              {loading && ( // Optional: overlay visual cue when loading
                <div className="absolute inset-0 bg-black/20"></div>
              )}
            </div>
          </div>

          {/* Output */}
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-3">
              <label
                htmlFor="translatedText"
                className={`block ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                } text-lg font-medium`}
              >
                {outputLabel}:
                {loading && (
                  <Loader2
                    className={`animate-spin inline-block ml-3 ${
                      darkMode ? "text-blue-400" : "text-blue-600"
                    }`}
                    size={20}
                  />
                )}
              </label>

              {/* Enhanced copy/download/share options for translation */}
              {translated && (
                <div className="flex items-center gap-2">
                  {/* Copy button for output */}
                  <button
                    onClick={copyToClipboard}
                    className={`px-3 py-2 ${actionButtonClasses} rounded-lg text-sm flex items-center gap-1 transition-colors duration-200 border shadow-sm hover:shadow`}
                    aria-label="Αντιγραφή μετάφρασης"
                  >
                    {copied ? (
                      <>
                        <Check size={16} className="text-green-500" />
                        <span>Αντιγράφηκε</span>
                      </>
                    ) : (
                      <>
                        <ClipboardCopy
                          size={16}
                          className={
                            darkMode ? "text-blue-400" : "text-blue-600"
                          }
                        />
                        <span>Αντιγραφή</span>
                      </>
                    )}
                  </button>

                  {/* Download button */}
                  <button
                    onClick={downloadTranslation}
                    className={`px-3 py-2 ${secondaryButtonClasses} rounded-lg text-sm transition-colors duration-200`}
                    aria-label="Λήψη μετάφρασης ως αρχείο"
                    title="Λήψη ως αρχείο κειμένου"
                  >
                    <Download
                      size={16}
                      className={darkMode ? "text-blue-400" : "text-blue-600"}
                    />
                  </button>
                </div>
              )}
            </div>

            <div
              className={`relative flex-grow min-h-[220px] rounded-xl ${inputBgClasses} border transition-colors duration-200 ease-in-out overflow-hidden`}
            >
              <textarea
                id="translatedText"
                value={translated}
                readOnly
                placeholder={
                  loading
                    ? "Μετάφραση σε εξέλιξη..."
                    : "Η μετάφραση θα εμφανιστεί εδώ..."
                }
                className={`w-full h-full p-4 bg-transparent text-lg placeholder-gray-500 resize-none overflow-auto focus:outline-none`}
              ></textarea>

              {/* Loading progress bar */}
              {loading && (
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 bg-size-200 animate-gradient-x"></div>
              )}

              {/* Quick Copy Overlay - Appears when hovering over output */}
              {translated && !loading && (
                <div className="absolute inset-0 bg-transparent flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={copyToClipboard}
                    className={`p-4 rounded-full ${
                      darkMode ? "bg-blue-600/80" : "bg-blue-500/80"
                    } text-white shadow-lg transform transition-transform duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    aria-label="Quick copy translation"
                  >
                    {copied ? (
                      <Check size={24} className="text-white" />
                    ) : (
                      <ClipboardCopy size={24} className="text-white" /> // Changed to ClipboardCopy for consistency
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Translate Button */}
        <button
          onClick={handleTranslate}
          disabled={
            loading || !text.trim() || (isProduction && provider === "ollama")
          } // <-- Disable if Ollama is selected in production
          className={`w-full ${buttonGradient} text-white font-bold py-4 rounded-xl text-xl shadow-lg hover:shadow-xl transition transform hover:-translate-y-1 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={24} />
              <span>Μετάφραση σε εξέλιξη...</span>
            </>
          ) : (
            <>
              <Sparkles size={20} />
              <span>Μετάφραση</span>
            </>
          )}
        </button>

        {error && (
          <div className="p-4 bg-red-800/50 border border-red-700 text-red-300 rounded-lg">
            Σφάλμα: {error}
          </div>
        )}

        {/* Footer Note */}
        <p
          className={`text-center ${
            darkMode ? "text-gray-500" : "text-gray-600"
          } text-sm mt-8`}
        >
          Πάροχος:{" "}
          {provider === "ollama"
            ? `Ollama (Local LLM - Meltemi)` // Text for Ollama local models
            : provider === "gemini"
            ? "Gemini API (Cloud LLM)" // Text for Gemini
            : provider === "deepsick"
            ? "DeepSeek API (Cloud LLM)" // Text for DeepSeek
            : provider === "chatgpt"
            ? "ChatGPT API (Cloud LLM)" // <-- New text for ChatGPT
            : "Αγνωστος"}{" "}
          {/* Fallback just in case */}
          .
          <br />Η ταχύτητα εξαρτάται από τον πάροχο και το hardware.
          {provider === "gemini" &&
            !process.env.NEXT_PUBLIC_GEMINI_API_KEY_EXISTS &&
            !isProduction && (
              <span className="text-yellow-400 block text-xs mt-1">
                Σημείωση: Βεβαιωθείτε ότι το GEMINI_API_KEY είναι ρυθμισμένο
                στις environment variables του backend.
              </span>
            )}
          {isProduction && provider === "ollama" && (
            <span className="text-red-400 block text-xs mt-1">
              Το μοντέλο Ollama είναι απενεργοποιημένο σε production περιβάλλον.
            </span>
          )}
          {isProduction && provider === "deepsick" && (
            <span className="text-red-400 block text-xs mt-1">
              Το μοντέλο Deepsick είναι απενεργοποιημένο σε production
              περιβάλλον.
            </span>
          )}
          {!isSpeechApiSupported && (
            <span
              className={`${
                darkMode ? "text-gray-400" : "text-gray-500"
              } block text-xs mt-1`}
            >
              Σημείωση: Η φωνητική εισαγωγή δεν υποστηρίζεται σε αυτόν τον
              browser.
            </span>
          )}
        </p>
        <Disclaimer darkMode={darkMode} />
        <p
          className={`text-center ${
            darkMode ? "text-gray-500" : "text-gray-600"
          } text-sm mt-8`}
        >
          Giorgos Iliopoulos © {new Date().getFullYear()}
        </p>
      </div>
      {/* History Panel */}
      {/* History Panel (Visible when showHistory is true) */}
      {showHistory && (
        <div
          className={`fixed inset-0 ${
            darkMode ? "bg-black/60" : "bg-black/40"
          } flex justify-center items-center z-50`}
          onClick={() => setShowHistory(false)}
        >
          <div
            className={`relative ${cardClasses} rounded-lg shadow-xl p-6 w-full max-w-md max-h-[80vh] overflow-y-auto transition-colors duration-300`}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the panel
          >
            <h2
              className={`text-2xl font-bold mb-4 ${
                darkMode ? "text-gray-200" : "text-gray-800"
              }`}
            >
              Ιστορικό Μεταφράσεων
            </h2>

            {/* --- History Search and Filter --- */}
            <div className="mb-4 space-y-4">
              {/* Search Input */}
              <input
                type="text"
                placeholder="Αναζήτηση στο κείμενο εισόδου..."
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                className={`w-full px-4 py-2 border rounded-md ${inputBgClasses} ${
                  darkMode
                    ? "text-gray-200 border-gray-600 placeholder-gray-500"
                    : "text-gray-800 border-gray-300 placeholder-gray-400"
                }`}
              />

              {/* Filter Options */}
              <div className="flex items-center gap-4 text-sm">
                <span className={darkMode ? "text-gray-300" : "text-gray-700"}>
                  Φίλτρο:
                </span>
                <label
                  className={`flex items-center cursor-pointer ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="historyFilter"
                    value="all"
                    checked={historyFilter === "all"}
                    onChange={() => setHistoryFilter("all")}
                    className={`form-radio h-4 w-4 mr-1 accent-blue-500`}
                  />{" "}
                  Όλα
                </label>
                <label
                  className={`flex items-center cursor-pointer ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="historyFilter"
                    value="favorites"
                    checked={historyFilter === "favorites"}
                    onChange={() => setHistoryFilter("favorites")}
                    className={`form-radio h-4 w-4 mr-1 accent-yellow-500`}
                  />{" "}
                  Αγαπημένα
                </label>
              </div>
            </div>
            {/* --- End History Search and Filter --- */}

            {/* History List */}
            {filteredHistory.length > 0 ? ( // Use filteredHistory here
              <ul className="space-y-4">
                {filteredHistory.map(
                  (
                    item // Use filteredHistory here
                  ) => (
                    <li
                      key={item.timestamp} // Unique key for list items
                      className={`p-4 rounded-md border ${
                        darkMode
                          ? "border-gray-700 bg-gray-800"
                          : "border-gray-300 bg-gray-100"
                      } transition-colors duration-200`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 mr-4">
                          <p
                            className={`text-xs ${
                              darkMode ? "text-gray-400" : "text-gray-600"
                            } mb-1`}
                          >
                            {new Date(item.timestamp).toLocaleString()} -{" "}
                            {item.provider} - {item.direction}
                          </p>
                          <p
                            className={`${
                              darkMode ? "text-gray-200" : "text-gray-800"
                            } font-medium`}
                          >
                            {item.input.substring(0, 100)}
                            {item.input.length > 100 ? "..." : ""}{" "}
                            {/* Show truncated input */}
                          </p>
                        </div>
                        {/* --- Favorite Button --- */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(item.timestamp);
                          }} // Stop propagation to prevent loading item
                          className={`p-1 rounded-full transition-colors duration-200 ${
                            item.isFavorite
                              ? "text-yellow-500 hover:bg-yellow-500/20" // Favorite state color
                              : `${
                                  darkMode
                                    ? "text-gray-500 hover:text-yellow-500 hover:bg-gray-700"
                                    : "text-gray-400 hover:text-yellow-600 hover:bg-gray-200"
                                }` // Not favorite state color
                          }`}
                          title={
                            item.isFavorite
                              ? "Remove from favorites"
                              : "Add to favorites"
                          }
                        >
                          {/* Use a star icon, filled if favorite, outline if not */}
                          {item.isFavorite ? (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="w-5 h-5"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.106 21.26c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={1.5}
                              stroke="currentColor"
                              className="w-5 h-5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557L3.396 9.28a.562.562 0 0 1-.322-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                      <button
                        onClick={() => loadFromHistory(item)}
                        className={`w-full text-left ${
                          darkMode
                            ? "text-gray-300 hover:text-blue-400"
                            : "text-gray-700 hover:text-blue-600"
                        } transition-colors duration-200 text-sm`}
                      >
                        {item.output.substring(0, 100)}
                        {item.output.length > 100 ? "..." : ""}{" "}
                        {/* Show truncated output */}
                      </button>
                    </li>
                  )
                )}
              </ul>
            ) : (
              <p className={darkMode ? "text-gray-400" : "text-gray-600"}>
                {history.length > 0
                  ? "No results found for your search/filter."
                  : "Το ιστορικό είναι άδειο."}{" "}
                {/* Message if history is empty or filter/search yields no results */}
              </p>
            )}

            {/* Clear History Button */}
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className={`${secondaryButtonClasses} mt-4 w-full flex items-center justify-center p-3 rounded-md`}
              >
                <History size={18} className="mr-2" />
                Εκκαθάριση Ιστορικού
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={() => setShowHistory(false)}
              className="absolute top-2 right-2 p-2 rounded-full hover:bg-gray-200 hover:text-gray-800 dark:hover:bg-gray-700 dark:hover:text-gray-200 transition-colors"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
      {/* End of showHistory block */}
    </main>
  );
}

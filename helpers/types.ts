export interface Window {
  SpeechRecognition: typeof SpeechRecognition;
  webkitSpeechRecognition: typeof SpeechRecognition;
  SpeechGrammarList: typeof SpeechGrammarList;
  webkitSpeechGrammarList: typeof SpeechGrammarList;
  SpeechRecognitionEvent: typeof SpeechRecognitionEvent;
}
export interface TranslationHistoryItem {
  input: string; // The original input text
  output: string; // The translated output text
  direction: "Νέα → Αρχαία" | "Αρχαία → Νέα"; // The translation direction
  provider: "Ollama" | "Gemini" | "DeepSeek" | "ChatGPT"; // The AI provider used
  timestamp: number; // Timestamp of the translation for sorting/identification
  isFavorite: boolean; // <-- Add this property for marking as favorite
  modernStyle?: "standard" | "katharevousa"; // <-- Add this property (optional for old history)

}

export interface DisclaimerProps {
  darkMode: boolean;
}

export interface Window {
  SpeechRecognition: typeof SpeechRecognition;
  webkitSpeechRecognition: typeof SpeechRecognition;
  SpeechGrammarList: typeof SpeechGrammarList;
  webkitSpeechGrammarList: typeof SpeechGrammarList;
  SpeechRecognitionEvent: typeof SpeechRecognitionEvent;
}
export interface TranslationHistoryItem {
  input: string;
  output: string;
  direction: "Νέα → Αρχαία" | "Αρχαία → Νέα";
  provider: "Ollama" | "Gemini" | "DeepSeek" | "ChatGPT";
  timestamp: number;
}

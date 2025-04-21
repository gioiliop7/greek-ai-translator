

# Greek AI Translator

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

## Description

The Greek AI Translator is a translation application that leverages the power of Large Language Models (LLMs) to translate text between Ancient and Modern Greek. It supports using both local models (via Ollama) and multiple cloud-based models (via the Google Gemini API, DeepSeek API, and OpenAI ChatGPT API).

It's built with Next.js (App Router, React), Tailwind CSS, and communicates with LLM backends via API routes secured with basic middleware checks (Origin validation, Rate Limiting).

## Features

-   Translation between Ancient and Modern Greek.
-   Multiple Translation Provider Selection:
    -   Local model (e.g., Meltemi) via **Ollama** (primarily for development).
    -   Cloud model (e.g., Gemini Pro) via **Google Gemini API**.
    -   Cloud model (e.g., DeepSeek Chat) via **DeepSeek API**.
    -   Cloud model (e.g., GPT-3.5-turbo, GPT-4o) via **OpenAI ChatGPT API**.
    -   Conditional provider usage based on environment (Ollama primarily in development).
-   Streaming response for immediate display of the translation as it's generated.
-   Dark/Light theme.
-   Enhanced Translation History with storage **only in the browser's Local Storage**:
    -   View historical translations.
    -   Search within history based on input text.
    -   Mark/unmark history items as Favorites.
    -   Filter history to show only Favorites.
    -   Clear entire history.
-   Clear input text.
-   Voice input (Speech-to-Text) via Web Speech API.
-   Drag and Drop of .txt files onto the input area for loading text.
-   Copy translated text to the clipboard.
-   Download translation as a .txt file.
-   Share translation via Web Share API.
-   Input character count display.
-   Basic Backend Security Middleware:
    -   Origin Header validation to restrict access from unknown domains.
    -   Rate Limiting using Upstash Redis to mitigate API abuse (e.g., limit requests per IP).
-   Disclaimer Component: Provides important notes about AI output, data handling (local storage), and the application's purpose.
-   Placeholder functionality for Feedback (under development).
-   (Conceptual/Under Development) Features: Ancient Greek morphological analysis, lemma display, dictionary lookup (requires external tools/APIs).

## Technologies

-   **Frontend:** Next.js (App Router), React, Tailwind CSS
-   **Backend:** Next.js API Routes (Node.js), Middleware
-   **LLM Interaction:** `Workspace` API, potentially provider-specific libraries (`@google/generative-ai` for Gemini).
-   **Local LLM:** Ollama
-   **Cloud LLMs:** Google Gemini API, DeepSeek API, OpenAI ChatGPT API
-   **Backend State/Rate Limiting:** Upstash Redis, `@upstash/redis`, `@upstash/ratelimit`
-   **Icons:** Lucide React
-   **Browser APIs:** Web Speech API, Web Share API, Local Storage, File Reader API

## Prerequisites

To run the application, you need:

-   **Node.js** (v18 or later recommended) and **npm**, **yarn**, or **pnpm**.
-   **Ollama** installed and running on your machine, if you want to use the Ollama provider in development.
-   The **`ilsp/meltemi-instruct`** model pulled in Ollama (`ollama pull ilsp/meltemi-instruct`), if using the Ollama provider.
-   A **Google Gemini API Key** if you want to use the Gemini API provider.
-   A **DeepSeek API Key** if you want to use the DeepSeek API provider.
-   An **OpenAI API Key** if you want to use the OpenAI ChatGPT API provider.
-   An **Upstash Redis Database** (free tier available) and its **REST URL** and **REST Token** for Rate Limiting.

## Setup

You can set up the application for local development or for hosting with Docker.

### Configure Environment Variables

Obtain all required API keys and Upstash Redis details:

-   **Gemini API Key:** From [Google AI Studio](https://aistudio.google.com/app/apikey).
-   **DeepSeek API Key:** From [DeepSeek Open Platform](https://www.deepseek.com/).
-   **OpenAI API Key:** From [OpenAI Platform](https://platform.openai.com/account/api-keys).
-   **Upstash Redis REST URL and Token:** From your [Upstash Console](https://console.upstash.com/).

In the root of your project, create or update your `.env.local` file with the following lines, replacing the placeholder values with your actual keys and URL/token:

```dotenv
# Google Gemini API Key (for Gemini provider)
GEMINI_API_KEY=YOUR_GEMINI_API_KEY

# DeepSeek API Key (for DeepSeek provider)
DEEPSEEK_API_KEY=YOUR_DEEPSEEK_API_KEY

# OpenAI API Key (for ChatGPT provider)
OPENAI_API_KEY=sk-YOUR_OPENAI_KEY

# Upstash Redis details (for Rate Limiting)
UPSTASH_REDIS_REST_URL=your_upstash_redis_rest_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token

# Frontend URL for Origin Check Middleware (usually http://localhost:3000 for dev)
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000

# (Optional) Bearer Token Secret if you implemented that middleware layer
# BEARER_TOKEN_SECRET=your_very_long_and_random_secret_token

# (Optional) Request Signing Secret if you implemented that middleware layer
# REQUEST_SIGNING_SECRET=your_unique_signing_secret_string

```

**Note:** The `.env.local` file should be added to your `.gitignore` to prevent committing your secret keys.

### Local Development

1.  **Clone the repository:**
    
    Bash
    
    ```
    git clone [YOUR REPOSITORY URL]
    cd [YOUR PROJECT FOLDER]
    
    ```
    
2.  **Install dependencies:**
    
    Bash
    
    ```
    npm install # or yarn install or pnpm install
    
    ```
    
3.  **Configure Environment Variables:** Follow the steps in the "Configure Environment Variables" section above to create and populate your `.env.local` file.
    
4.  **Set up Ollama (if you will use it in development):**
    
    -   Follow the installation instructions on the [official Ollama website](https://ollama.com/download).
    -   Start the Ollama server (`ollama serve` or it may run automatically).
    -   Pull the Meltemi model: `ollama pull ilsp/meltemi-instruct`.
    -   Ensure the Ollama server is running and accessible at `http://localhost:11434`.
5.  **Start the development server:**
    
    Bash
    
    ```
    npm run dev # or yarn dev or pnpm dev
    
    ```
    
    The application will be available at `http://localhost:3000`.
    

### Hosting with Docker Compose

For a more robust setup for hosting on a server, you can use Docker Compose. This will set up Ollama alongside your Next.js application.

1.  **Prerequisites:**
    
    -   **Docker** and **Docker Compose** installed on the server.
2.  **Clone the repository and create the `.env.local`** as described in the "Configure Environment Variables" section. Ensure the `.env.local` file is in the same directory as your `docker-compose.yml`.
    
3.  **Ensure the `Dockerfile` and `docker-compose.yml` files** are in the root of your project (these should be the files provided previously or updated based on our discussion). Your `docker-compose.yml` should pass the necessary environment variables to the `app` service.
    
4.  **Start the services with Docker Compose:** Open a terminal in the root of your project and run:
    
    Bash
    
    ```
    docker-compose up -d --build
    
    ```
    
    -   This will build the image, set up the Ollama service and pull the model, and start the Next.js application.
    -   The Next.js application will be available at `http://<SERVER_IP_ADDRESS>:3000`. Remember to configure a reverse proxy in front of it for production.
5.  **Monitor logs:**
    
    Bash
    
    ```
    docker-compose logs
    # or docker-compose logs app # For Next.js app logs
    # or docker-compose logs ollama # For Ollama server logs
    
    ```
    
6.  **Stop services:**
    
    Bash
    
    ```
    docker-compose down # Stops and removes containers and network
    # docker-compose down --volumes # Stops, removes containers/network AND Ollama model data
    
    ```
    

## Usage

Visit the address where the application is running (e.g., `http://localhost:3000` or `http://<SERVER_IP_ADDRESS>:3000`).

1.  Select the translation provider (Ollama, Gemini, DeepSeek AI, or ChatGPT).
2.  Select the translation direction.
3.  Type or paste text into the input field. You can also use voice input or drag-and-drop a `.txt` file.
4.  Click the "Μετάφραση" (Translate) button. The translation will appear incrementally.
5.  Once complete, use the action buttons (copy, download, share).
6.  Access the History panel (clock icon) to view, search, mark as favorite, filter, load, or clear past translations.

## Production Notes

-   In a production environment (`NODE_ENV=production`), the application is configured to **prefer and use Cloud providers (Gemini, DeepSeek, ChatGPT)**. The Ollama provider is typically disabled or not recommended in production unless you manage a separate Ollama server for production use.
-   **Secure Configuration:** It is critical to securely configure ALL your API keys (`GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, `OPENAI_API_KEY`) and Upstash Redis keys (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) in the environment variables of your production hosting environment. **Never commit your `.env.local` file.**
-   **Rate Limiting:** The implemented Rate Limiting middleware is essential for mitigating abuse and controlling costs associated with cloud LLM APIs. Ensure it is properly configured with your Upstash Redis details in production. Adjust the limits (e.g., 10 requests per 60s) based on your expected user traffic and desired restrictions.
-   For production deployment, it's highly recommended to use a reverse proxy (e.g., Nginx, Caddy) in front of the Next.js application (running on port 3000) for managing SSL/TLS encryption, caching, compression, and potentially more advanced Rate Limiting or Web Application Firewall (WAF) features.

## Privacy Note

Please read the important disclaimer text within the application UI for full details. Key points regarding your data:

-   The text you enter and the translation history are processed temporarily to provide the translation service.
-   Your translation history is stored **exclusively on your own computer** (in the browser's Local Storage).
-   Your input text or translation history is **NOT sent, stored, or associated** in any way with the application's servers, the AI providers (beyond the temporary processing needed for the response), or any third parties.

## Licensing

This project is licensed under the **GNU General Public License v3.0 (GPLv3)**.

This license ensures that anyone who uses, modifies, or distributes this software must make the source code of their modifications available under the same GPLv3 terms. This helps keep the software free and encourages improvements to be shared back to the community, aligning with the goal of allowing Pull Requests for the betterment of the product while discouraging the creation of proprietary, closed-source forks.

You should have received a copy of the GNU GPL v3.0 license text with this software (in the `LICENSE` file). If not, you can find it at <https://www.gnu.org/licenses/gpl-3.0.html>.

## Contributing

Contributions are welcome! If you find issues or have ideas for improvements, please open an issue or submit a Pull Request on the project's repository.

By contributing under the GPLv3 license, you agree that your contributions will be licensed under the same terms.

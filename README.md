# Greek AI Translator

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0) ## Description

The Greek AI Translator is a translation application that leverages the power of Large Language Models (LLMs) to translate text between Ancient and Modern Greek. It supports using both local models (via Ollama) and cloud models (via the Google Gemini API).

It's built with Next.js (App Router, React), Tailwind CSS, and communicates with LLM backends via API routes.

## Features

- Translation between Ancient and Modern Greek.
- Translation provider selection:
  - Local model (e.g., Meltemi) via Ollama.
  - Cloud model (e.g., Gemini Pro) via Google Gemini API.
  - Ollama provider disabled in production environment.
- Streaming response for immediate display of the translation as it's generated.
- Dark/Light theme.
- Translation history with storage in the browser's Local Storage.
- Clear input text.
- Voice input (Speech-to-Text) via Web Speech API.
- Drag and Drop of .txt files for loading text.
- Copy translated text to the clipboard.
- Download translation as a .txt file.
- Share translation via Web Share API.
- Input character count display.
- Placeholder functionality for Feedback (under development).

## Technologies

- **Frontend:** Next.js (App Router), React, Tailwind CSS
- **Backend:** Next.js API Routes (Node.js)
- **LLM Interaction:** `Workspace` API, `@google/generative-ai` library
- **Local LLM:** Ollama
- **Cloud LLM:** Google Gemini API
- **Icons:** Lucide React
- **Browser APIs:** Web Speech API, Web Share API, Local Storage, File Reader API

## Prerequisites

To run the application, you need:

- **Node.js** (v18 or later recommended) and **npm**, **yarn**, or **pnpm**.
- **Ollama** installed and running on your machine, if you want to use the Ollama provider.
- The **`ilsp/meltemi-instruct`** model pulled in Ollama (`ollama pull ilsp/meltemi-instruct`).
- A **Google Gemini API Key** if you want to use the Gemini API provider.

## Setup

You can set up the application for local development or for hosting with Docker.

### Local Development

1.  **Clone the repository:**

    ```bash
    git clone [YOUR REPOSITORY URL]
    cd [YOUR PROJECT FOLDER]
    ```

2.  **Install dependencies:**

    ```bash
    npm install # or yarn install or pnpm install
    ```

3.  **Configure Environment Variables (for Gemini API):**

    - Obtain a Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
    - In the root of your project, create a file named `.env.local`.
    - Add the following line, replacing `YOUR_GEMINI_API_KEY` with your key:
      ```dotenv
      GEMINI_API_KEY=YOUR_GEMINI_API_KEY
      ```

4.  **Set up Ollama (if you will use it):**

    - Follow the installation instructions on the [official Ollama website](https://ollama.com/download).
    - Start the Ollama server (usually runs automatically after installation or with the command `ollama serve`).
    - Pull the Meltemi model:
      ```bash
      ollama pull ilsp/meltemi-instruct
      ```
    - Ensure the Ollama server is running and accessible at `http://localhost:11434`. For optimal performance, ensure it uses GPU acceleration.

5.  **Start the development server:**

    ```bash
    npm run dev # or yarn dev or pnpm dev
    ```

    The application will be available at `http://localhost:3000`.

### Hosting with Docker Compose

For a more robust setup for hosting on a server, you can use Docker Compose.

1.  **Prerequisites:**

    - **Docker** and **Docker Compose** installed on the server.

2.  **Clone the repository and create the `.env.local`** just like in local development. Ensure the `.env.local` file is at the root of the project.

3.  **Ensure the `Dockerfile` and `docker-compose.yml` files** are in the root of your project (these should be the files provided previously).

4.  **Set up your `GEMINI_API_KEY`:** Ensure the `GEMINI_API_KEY` is set in the environment where you run `docker-compose up` (e.g., by having it in `.env.local` in the same directory as `docker-compose.yml`, or by exporting it in your shell: `export GEMINI_API_KEY=YOUR_GEMINI_API_KEY`).

5.  **Start the services with Docker Compose:**
    Open a terminal in the root of your project and run:

    ```bash
    docker-compose up -d --build
    ```

    - This will build the image, set up Ollama and the model, and start the application.
    - The Next.js application will be available at `http://<SERVER_IP_ADDRESS>:3000`.

6.  **Monitor logs:**

    ```bash
    docker-compose logs
    # or docker-compose logs app # For Next.js app logs
    # or docker-compose logs ollama # For Ollama server logs
    ```

7.  **Stop services:**
    ```bash
    docker-compose down # Stops and removes containers and network
    # docker-compose down --volumes # Stops, removes containers/network AND Ollama model data
    ```

## Usage

Visit the address where the application is running (e.g., `http://localhost:3000` or `http://<SERVER_IP_ADDRESS>:3000`).

1.  Select the translation provider (Ollama or Gemini).
2.  Select the translation direction (Modern → Ancient or Ancient → Modern).
3.  Type or paste text into the input field. You can also:
    - Use the microphone button for voice input (Speech-to-Text).
    - Drag and drop a `.txt` file onto the input area.
4.  Click the "Μετάφραση" (Translate) button.
5.  The translation will appear incrementally in the output field.
6.  Once the translation is complete, you can copy it, download it as a .txt file, or share it (if supported by the browser).
7.  Translations are saved in the History (available via the clock icon).

## Production Notes

- In a production environment (`NODE_ENV=production`), the Ollama provider is disabled by default, as it requires the user to have the Ollama server available. You can change this logic if needed.
- Ensure the `GEMINI_API_KEY` is securely configured in the environment variables of your production hosting environment, not relying on `.env.local`.
- For production deployment, it's recommended to use a reverse proxy (e.g., Nginx, Caddy) in front of the Next.js application (running on port 3000) for managing SSL/TLS, caching, compression, etc.

## Licensing

This project is licensed under the **GNU General Public License v3.0 (GPLv3)**.

This license ensures that anyone who uses, modifies, or distributes this software must make the source code of their modifications available under the same GPLv3 terms. This helps keep the software free and encourages improvements to be shared back to the community, aligning with the goal of allowing Pull Requests for the betterment of the product while discouraging the creation of proprietary, closed-source forks.

You should have received a copy of the GNU GPL v3.0 license text with this software (in the `LICENSE` file). If not, you can find it at <https://www.gnu.org/licenses/gpl-3.0.html>.

## Contributing

Contributions are welcome! If you find issues or have ideas for improvements, please open an issue or submit a Pull Request on the project's repository.

By contributing under the GPLv3 license, you agree that your contributions will be licensed under the same terms.

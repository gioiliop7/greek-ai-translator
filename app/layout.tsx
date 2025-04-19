import type { Metadata } from "next";
import { Syne } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["greek", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Generate more complete metadata
export const metadata: Metadata = {
  title: {
    default: "Lexi AI", // Default title
    template: "%s | Lexi AI", // Template for page-specific titles
  },
  applicationName: "Greek AI Translator App", // Name of the application
  description:
    "Powerful AI Translator for Ancient and Modern Greek, powered by local (Ollama/Meltemi) and cloud (Gemini) models.",
  keywords: [
    // Relevant keywords
    "greek translator",
    "ancient greek",
    "modern greek",
    "ai translation",
    "ollama",
    "meltemi",
    "gemini",
    "language translation",
    "ελληνική μετάφραση",
    "αρχαία ελληνικά",
    "νέα ελληνικά",
    "μεταφραστής",
  ],
  authors: [{ name: "Giorgos Iliopoulos" }], // Replace with your name/entity
  creator: "Giorgos Iliopoulos", // Replace with your name/entity

  // Open Graph metadata (for social media sharing)
  openGraph: {
    title: "Lexi AI",
    description: "Powerful AI Translator for Ancient and Modern Greek.",
    siteName: "Lexi AI",
    locale: "en_US", // Or 'el_GR'
    type: "website",
  },

  // Twitter Card metadata (for Twitter sharing)
  twitter: {
    card: "summary_large_image", // or 'summary'
    title: "Lexi AI",
    description: "Powerful AI Translator for Ancient and Modern Greek.",
  },

  // Viewport for responsive design
  viewport: {
    width: "device-width",
    initialScale: 1,
  },

  // Robots meta tag
  robots: {
    index: true,
    follow: true,
    nocache: false, // or true if you don't want caching
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={syne.variable}>
      <body className={`${syne.className} antialiased`}>{children}</body>
    </html>
  );
}

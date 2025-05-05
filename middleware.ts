// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Redis } from "@upstash/redis"; // Import Redis client
import { Ratelimit } from "@upstash/ratelimit"; // Import RateLimiter

// --- Existing Allowed Origins (Keep this check) ---
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000",
  // Add other allowed origins if needed
];

// --- Rate Limiting Setup ---
// Initialize Upstash Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!, // Use non-null assertion as we check later or expect it to be set
  token: process.env.UPSTASH_REDIS_REST_TOKEN!, // Use non-null assertion
});

// Check if Redis details are configured (important for production)
const isRateLimitingConfigured =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

// Configure the Rate Limiter
// For example: Allow 10 requests every 60 seconds per IP address
// Adjust the limit and duration based on expected usage
const ratelimit = new Ratelimit({
  redis: redis, // Use the initialized Redis client
  limiter: Ratelimit.slidingWindow(10, "60s"), // 10 requests in a 60-second sliding window
  /**
   * Optional: If you want to include headers that notify the client about the rate limit.
   * headers: ["x-ratelimit-limit", "x-ratelimit-remaining", "x-ratelimit-reset"],
   */
  analytics: true, // Optional: Send analytics to Upstash
  timeout: 5000, // Optional: Timeout for Redis calls (in ms)
});

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

async function verifyRecaptcha(token: string | null): Promise<boolean> {
  if (!token) {
    return false;
  }

  const verificationUrl = `https://www.google.com/recaptcha/api/siteverify`;

  try {
    const response = await fetch(verificationUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `secret=${RECAPTCHA_SECRET_KEY}&response=${token}`,
    });

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error("reCAPTCHA verification failed:", error);
    return false;
  }
}

export async function middleware(request: NextRequest) {
  // Middleware must be async because of await in ratelimit.limit()

  // --- 1. Origin Check (already implemented) ---
  const origin = request.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    console.warn(
      `Middleware: Request blocked by Origin check from unauthorized origin: ${origin} to ${request.nextUrl.pathname}`
    );
    return new NextResponse("Forbidden (Invalid Origin)", { status: 403 });
  }

  // --- 2. Rate Limiting Check ---
  // Apply rate limiting only to POST requests to API routes
  if (
    request.method === "POST" &&
    request.nextUrl.pathname.startsWith("/api/")
  ) {
    // If Rate Limiting is not configured, skip the check (maybe log a warning in dev)
    if (!isRateLimitingConfigured) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "Middleware: Rate Limiting is not configured. Skipping check in development."
        );
      } else {
        // In production, you might want to return an error or block requests if rate limiting is required but not configured
        console.error(
          "Middleware: Rate Limiting is not configured in production. Requests are not limited."
        );
        // Optional: return new NextResponse('Internal Server Error (Rate Limiting Not Configured)', { status: 500 });
      }
    } else {
      // Determine the identifier for rate limiting (e.g., client IP address)
      // Getting the user's IP in Next.js middleware can be tricky and depends on deployment platform
      // request.ip might work on some platforms (Vercel, Netlify) but not all (standard Node.js server, Docker).
      // A more reliable approach might involve headers added by a proxy (e.g., X-Forwarded-For)
      // For simplicity, let's use a dummy ID or try request.ip if available.
      const ipIdentifier =
        request.headers.get("x-forwarded-for") || "anonymous"; // Use IP if available, otherwise a generic ID

      // Perform the rate limit check
      const { success, pending, limit, remaining, reset } =
        await ratelimit.limit(ipIdentifier);

      // Log rate limit status (optional)
      console.log(
        `Middleware: Rate Limit for ${ipIdentifier}: ${remaining}/${limit}, resets at ${new Date(
          reset * 1000
        ).toISOString()}`
      );
      console.log(pending);

      // If the rate limit is exceeded
      if (!success) {
        console.warn(
          `Middleware: Rate limit exceeded for IP: ${ipIdentifier} on ${request.nextUrl.pathname}`
        );

        // Return a 429 Too Many Requests response
        // Add optional headers to inform the client about the rate limit status
        const response = new NextResponse(
          "Πολλά αιτήματα ανά λεπτό. Παρακαλώ προσπαθήστε ξανά σε ένα λεπτό.",
          { status: 429 }
        );
        response.headers.set("X-RateLimit-Limit", limit.toString());
        response.headers.set("X-RateLimit-Remaining", remaining.toString());
        response.headers.set("X-RateLimit-Reset", reset.toString()); // Reset time in seconds

        return response;
      }

      // If the rate limit is not exceeded, you can optionally add headers
      // to the response before continuing.
      // request.headers.set('X-RateLimit-Limit', limit.toString()); // Headers are usually added to the Response, not the Request
      // request.headers.set('X-RateLimit-Remaining', remaining.toString());
      // request.headers.set('X-RateLimit-Reset', reset.toString());
    }
  }

  // --- 3. Rate Limiting Check ---

  // Extract the reCAPTCHA token from the request.
  // This assumes the client sends the token in the request body or headers.
  let token = null;

  try {
    const body = await request.json();
    token = body.recaptchaToken;
  } catch (e) {
    console.log(e);
  }

  const isRecaptchaValid = await verifyRecaptcha(token);

  if (!isRecaptchaValid) {
    // If reCAPTCHA is invalid, return an error response
    return new NextResponse("reCAPTCHA verification failed", { status: 401 });
  }

  // Continue to the next middleware or the route handler if all checks pass
  return NextResponse.next();
}

// Configure which paths the middleware should run on
export const config = {
  matcher: "/api/:path*", // Apply to all API routes
};

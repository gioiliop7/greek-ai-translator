# Stage 1: Build the Next.js application
# Use a stable Node.js version based on alpine for a small image size
FROM node:20-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and lock files (yarn.lock, pnpm-lock.yaml if you use them)
# Using wildcards to catch both possible lock files
COPY package.json package-lock.json* ./
# COPY yarn.lock ./ # If you are using Yarn
# COPY pnpm-lock.yaml ./ # If you are using pnpm

# Install dependencies
# Use --frozen-lockfile or --immutable to ensure reproducible builds
RUN npm install --frozen-lockfile # or yarn install --frozen-lockfile or pnpm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the Next.js application for production.
# The STANDALONE output is necessary for it to run autonomously.
RUN npm run build

# Stage 2: Run the production Next.js application
# Use a small base image again
FROM node:20-alpine AS runner

# Set the working directory
WORKDIR /app

# Copy only the necessary files from the standalone build stage
# This significantly reduces the size of the final image
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
# Copy the static directory if it exists
COPY --from=builder /app/.next/static ./.next/static

# Set environment variables for production
ENV NODE_ENV=production
# Set the host to listen on all addresses inside the container
ENV HOST=0.0.0.0
# The port the standalone Next.js server listens on (default 3000)
ENV PORT=3000

# Expose the port the application listens on
EXPOSE ${PORT}

# The command that will be executed when the container starts
# Runs the standalone Next.js server
CMD ["node", "server.js"]
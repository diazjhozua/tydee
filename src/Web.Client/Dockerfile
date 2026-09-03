# syntax=docker/dockerfile:1

########################
# Dependencies
########################
FROM node:22-alpine AS deps
WORKDIR /app
COPY src/Web.Client/package.json src/Web.Client/package-lock.json ./
RUN npm ci

########################
# Build
########################
FROM node:22-alpine AS build
WORKDIR /app
# Baked into the client bundle at build time; public by design. Override via
# the GH Actions workflow for homelab (https://tydee-api.diazjhozua.com).
ARG NEXT_PUBLIC_API_URL=http://localhost:5000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY --from=deps /app/node_modules ./node_modules
COPY src/Web.Client/package.json src/Web.Client/package-lock.json ./
COPY src/Web.Client/ ./
RUN npm run build

########################
# Runtime
########################
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000
# Server-side BFF env: where the auth route handlers proxy the API. Defaults to
# the build-time value; compose sets it explicitly to the public homelab URL.
ARG NEXT_PUBLIC_API_URL=http://localhost:5000
ENV API_URL=$NEXT_PUBLIC_API_URL
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
# Needed by `next start` at runtime (next.config pulls in Serwist wrapper).
COPY --from=build /app/next.config.ts ./next.config.ts
EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]

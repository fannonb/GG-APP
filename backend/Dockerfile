# GG'APP backend (NestJS + Prisma)
# Debian-based (node:24-slim) so Prisma's schema/query engines load correctly.
# OpenSSL is installed explicitly because Railway's default Railpack image was
# missing the matching libssl, which made the Prisma schema (migration) engine
# fail ("Could not parse schema engine response ... Error load").

# ---- Build stage ----
FROM node:24-slim AS build
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY prisma ./prisma
RUN npx prisma generate
COPY src ./src
RUN npm run build

# ---- Runtime stage ----
FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Full node_modules (includes Prisma engines + prisma CLI for migrations).
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./

EXPOSE 3000
CMD ["node", "dist/src/main.js"]

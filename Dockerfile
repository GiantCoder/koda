FROM node:22-alpine AS base
# ffmpeg provides ffprobe — required by video/analysis workers for frame extraction
RUN apk add --no-cache libc6-compat curl ffmpeg
WORKDIR /app
COPY package*.json ./
# Retries and longer timeout to reduce ECONNRESET failures on flaky networks
RUN npm config set fetch-retries 5 && npm config set fetch-retry-mintimeout 20000 && npm config set fetch-timeout 300000
RUN npm ci

FROM base AS development
COPY . .
RUN npx prisma generate
EXPOSE 3000 3001

FROM base AS builder
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

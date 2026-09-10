# Vision-X-Main production image (Next.js standalone + SQLite on a volume).
# No code changes needed for hosting: all URLs are relative or request-origin
# derived, and the DB auto-migrates on boot (src/lib/db.ts).

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=30001
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Seed the uploads dir (DB/workbook are created by migrations on first boot).
COPY --from=builder /app/data/uploads/.gitkeep ./data/uploads/.gitkeep
RUN mkdir -p ./data/uploads && chown -R app:app /app
# PERSISTENT DATA: mount a volume at /app/data (SQLite, uploads incl. the
# active UPI QR + payment proofs, and the master Excel workbook).
VOLUME ["/app/data"]
USER app
EXPOSE 30001
CMD ["node", "server.js"]

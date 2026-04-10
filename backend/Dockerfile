FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json prisma.config.ts ./
COPY prisma/ ./prisma/

RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

FROM node:24-alpine AS production

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/dist ./dist

# Run as non-root for least-privilege security
USER node

EXPOSE 3000

CMD ["node", "dist/src/server.js"]

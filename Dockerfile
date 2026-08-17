# ---- Stage 1: Build Frontend ----
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ---- Stage 2: Production Server ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Setup backend
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install --omit=dev

# Copy backend code
COPY backend/ /app/backend/

# Copy built frontend assets to backend for static serving
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Persist data & uploads directories
RUN mkdir -p /app/backend/data /app/backend/uploads

EXPOSE 3000

CMD ["node", "server.js"]

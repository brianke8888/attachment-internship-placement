FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json backend/
RUN cd backend && npm ci --only=production

COPY backend/ backend/
COPY frontend/ frontend/

EXPOSE 5000

WORKDIR /app/backend
CMD ["node", "server.js"]

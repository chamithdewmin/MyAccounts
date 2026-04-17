FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# File uploads default to backend/uploads. For Docker/production, set UPLOADS_DIR to a mounted path, e.g.:
#   -e UPLOADS_DIR=/data/uploads -v myaccounts_uploads:/data/uploads

EXPOSE 5000

ENV NODE_ENV=production
CMD ["node", "src/index.js"]

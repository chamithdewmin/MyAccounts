FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# File uploads: set UPLOADS_DIR to a mounted path or uploads are lost on redeploy. Example:
#   -e UPLOADS_DIR=/data/uploads -v myaccounts_uploads:/data/uploads
# See docker-compose.uploads.example.yml and .env.example

EXPOSE 5000

ENV NODE_ENV=production
CMD ["node", "src/index.js"]

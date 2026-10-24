FROM node:20.12.0-alpine

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --offline
COPY . .

ENV PORT=4173
EXPOSE 4173

RUN npm test
CMD ["node", "server.mjs"]

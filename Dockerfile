FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV PRESETS_FILE=/app/data/custom-presets.json
ENV RANKINGS_FILE=/app/data/ranking-records.json

COPY package.json ./
COPY server.js ./
COPY public ./public
COPY scripts ./scripts

EXPOSE 3000
VOLUME ["/app/data"]

CMD ["node", "server.js"]

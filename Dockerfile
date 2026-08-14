FROM node:20-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV PRESETS_FILE=/app/data/custom-presets.json
ENV RANKINGS_FILE=/app/data/ranking-records.json
ENV USERS_FILE=/app/data/users.json
ENV AKSHARE_PYTHON=/opt/akshare-venv/bin/python
ENV DATABASE_URL=postgres://ai_trade:ai_trade@postgres:5432/ai_trade
ENV EMAIL_FROM="AI Trade <onboarding@resend.dev>"

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates python3 python3-venv \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY requirements-akshare.txt ./
RUN python3 -m venv /opt/akshare-venv \
  && /opt/akshare-venv/bin/pip install --no-cache-dir --upgrade pip \
  && /opt/akshare-venv/bin/pip install --no-cache-dir -r requirements-akshare.txt

COPY server.js ./
COPY public ./public
COPY scripts ./scripts

EXPOSE 3000
VOLUME ["/app/data"]

CMD ["node", "server.js"]

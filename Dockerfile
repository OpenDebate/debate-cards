# Designed for development, for production you would copy the built files from this container
FROM node:20-bookworm-slim

WORKDIR /app

# openssl: required by prisma engines; unzip: used by bulk caselist downloads
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl unzip ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json yarn.lock ./
RUN yarn

COPY prisma prisma
RUN npx prisma generate

COPY tsconfig.json .
COPY src src

RUN yarn run build

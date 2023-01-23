# Designed for development, for production you would copy the built files from this container
FROM node:19.3.0

WORKDIR /app

COPY package*.json .
RUN yarn

COPY prisma prisma
COPY .env .
RUN npx prisma generate

COPY tsconfig.json .
COPY src src

RUN yarn run build
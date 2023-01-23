FROM node:18

WORKDIR /app
RUN npm install -g prisma --unsafe-perm
COPY .env .
COPY prisma ./prisma

CMD ["npx", "prisma", "migrate", "dev"]
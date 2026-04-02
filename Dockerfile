FROM mcr.microsoft.com/playwright:v1.51.1-jammy

WORKDIR /app

COPY package.json tsconfig.json ./
RUN npm install

COPY src ./src
COPY .env.example ./.env.example

ENV NODE_ENV=production
CMD ["npm", "run", "start"]

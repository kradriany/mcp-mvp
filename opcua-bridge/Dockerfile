# Version: 1.0.0
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production

COPY . .

EXPOSE 4000

CMD ["node", "index.js"] 
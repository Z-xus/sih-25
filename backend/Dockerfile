# FROM node:20-alpine
# WORKDIR /app
# COPY package*.json ./
# RUN npm ci --no-audit --no-fund
# COPY . .
# RUN npx prisma generate || true
# EXPOSE 5000
# CMD ["npm", "run", "dev"]


FROM node:20-bullseye
WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .

RUN npx prisma generate

EXPOSE 5000
CMD ["npm", "run", "dev"]

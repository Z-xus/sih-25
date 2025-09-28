# FROM node:20-alpine
# WORKDIR /app
# COPY package*.json ./
# RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund
# COPY . .
# EXPOSE 3000
# CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]


FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund
COPY . .

EXPOSE 3000

# Accept build arg and set as environment variable
ARG VITE_API_URL=http://localhost:5000
ENV VITE_API_URL=$VITE_API_URL

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

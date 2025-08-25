FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (remove --only=production if joi is in devDependencies)
RUN npm ci --only=production

# Copy source code
COPY . .

EXPOSE 8080

CMD ["node", "server.js"]
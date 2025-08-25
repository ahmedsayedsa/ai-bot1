FROM node:20-slim

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# Install deps
COPY package.json package-lock.json* ./
RUN npm install --production

# Copy source and public
COPY index.js ./
COPY public ./public/
# Ensure session dir exists
RUN mkdir -p auth_info_session

EXPOSE 8080
CMD ["npm", "start"]

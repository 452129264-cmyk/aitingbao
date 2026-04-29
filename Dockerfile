# rebuild fix
FROM node:18-slim
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --production
COPY backend/ .
EXPOSE 3000
CMD ["node", "src/index.js"]

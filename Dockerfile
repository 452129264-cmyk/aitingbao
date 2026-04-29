FROM node:18-slim
# v1.1 force rebuild
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --production
COPY backend/ .
EXPOSE 8080
CMD ["node", "src/index.js"]

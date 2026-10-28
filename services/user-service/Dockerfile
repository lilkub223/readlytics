FROM node:20-alpine
WORKDIR /workspace/services/user-service
COPY services/user-service/package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY services/user-service/ ./
COPY infra/docker/init.sql /workspace/infra/docker/init.sql
EXPOSE 4001
CMD ["npm", "start"]

FROM node:22-alpine

RUN npm install -g pnpm@10.5.2

WORKDIR /app

# Copy API package
COPY apps/api/package.json ./
RUN pnpm install

COPY apps/api/ ./
RUN pnpm build

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

CMD ["node", "dist/index.js"]

FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY app ./app
COPY server ./server
ENV NODE_ENV=production
ENV HOST=0.0.0.0
EXPOSE 3000
CMD ["npm", "start"]

FROM node:20-alpine
WORKDIR /app
# Datos de zonas horarias, para que TZ=America/Santiago funcione en la imagen alpine
RUN apk add --no-cache tzdata
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY src ./src
COPY scripts ./scripts
USER node
EXPOSE 3000
CMD ["node", "src/server.js"]

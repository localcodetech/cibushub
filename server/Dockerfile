FROM node:24-trixie-slim AS dev
RUN mkdir -p /app/node_modules && chown -R node:node /app
USER node
WORKDIR /app
COPY --chown=node:node package*.json ./
RUN npm install
COPY --chown=node:node . ./
EXPOSE 5000
CMD [ "npm", "run", "dev" ]

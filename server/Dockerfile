FROM node:24-trixie-slim AS dev
RUN mkdir -p /app/node_modules && chown -R node:node /app
USER node
WORKDIR /app
COPY --chown=node:node package*.json ./
RUN npm install
COPY --chown=node:node . ./
EXPOSE 5000
CMD [ "npm", "run", "dev" ]

# ─────────────────────────────────────────────
# Production: only what runs the app (no dev tools, tests or watch mode).
# The same image runs the api, the worker and the migrations; compose picks the command.
# ─────────────────────────────────────────────
FROM node:24-trixie-slim AS prod
ENV NODE_ENV=production
WORKDIR /app
RUN chown node:node /app
USER node
COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node .sequelizerc ./
COPY --chown=node:node src ./src
EXPOSE 5000
CMD [ "node", "src/index.js" ]

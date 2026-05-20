FROM node:22-alpine

WORKDIR /app

COPY . .

RUN if [ ! -d public ]; then \
      mkdir -p public; \
      mv index.html public/index.html; \
      mv app.js public/app.js; \
      mv styles.css public/styles.css; \
    fi

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]

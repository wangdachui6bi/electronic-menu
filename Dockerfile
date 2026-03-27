FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_MENU_API_BASE

ENV VITE_MENU_API_BASE=${VITE_MENU_API_BASE}

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine

RUN npm install -g serve

COPY --from=builder /app/dist /usr/share/app

EXPOSE 80

CMD ["serve", "-s", "/usr/share/app", "-l", "80"]

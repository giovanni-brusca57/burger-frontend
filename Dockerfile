# ---- Stage 1: Build ----
FROM node:20-alpine AS build

RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# VITE_* env vars harus di-pass saat build (bukan runtime)
ARG VITE_API_URL
ARG VITE_DEFAULT_REFERRAL
ARG VITE_MEV_PAGE

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_DEFAULT_REFERRAL=$VITE_DEFAULT_REFERRAL
ENV VITE_MEV_PAGE=$VITE_MEV_PAGE

RUN pnpm build

# ---- Stage 2: Serve ----
FROM nginx:alpine AS prod

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# 先装依赖，利用 layer 缓存
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline

# 再拷贝源码构建
COPY . .
RUN npm run build

# ── Stage 2: Nginx ───────────────────────────────────────────────
FROM nginx:stable-alpine

# 移除默认配置
RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

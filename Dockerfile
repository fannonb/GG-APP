# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Production defaults; override with Railway build args when needed.
# Vite inlines VITE_* vars at build time, so they must exist here.
ARG VITE_API_BASE_URL=https://api.gatewayglobal.africa/api/v1
ARG VITE_USE_MOCK_API=false
ARG VITE_GOOGLE_CLIENT_ID=
ARG VITE_VAPID_PUBLIC_KEY=
ARG VITE_ADMIN_PORTAL_PATH=/admin
ARG VITE_ADMIN_PORTAL_TOKEN=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_USE_MOCK_API=$VITE_USE_MOCK_API
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_VAPID_PUBLIC_KEY=$VITE_VAPID_PUBLIC_KEY
ENV VITE_ADMIN_PORTAL_PATH=$VITE_ADMIN_PORTAL_PATH
ENV VITE_ADMIN_PORTAL_TOKEN=$VITE_ADMIN_PORTAL_TOKEN

RUN npm run build

# ---- Serve stage ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# Stage build
FROM node:22-alpine AS build


WORKDIR /app

ARG NPM_VERSION
ARG VITE_APP_VERSION=$NPM_VERSION 
ENV VITE_APP_VERSION=$VITE_APP_VERSION

# Ricevo l'argomento per la variabile d'ambiente VITE_APP_API_URL
ARG VITE_APP_API_URL
ENV VITE_APP_API_URL=$VITE_APP_API_URL

ARG VITE_HONEYPOT_LOCATION_LAT
ENV VITE_HONEYPOT_LOCATION_LAT=$VITE_HONEYPOT_LOCATION_LAT

ARG VITE_HONEYPOT_LOCATION_LON
ENV VITE_HONEYPOT_LOCATION_LON=$VITE_HONEYPOT_LOCATION_LON

ARG VITE_HONEYPOT_NAME
ENV VITE_HONEYPOT_NAME=$VITE_HONEYPOT_NAME

COPY package*.json ./
RUN npm install
COPY . .

RUN npm run build

# Stage runtime - serve files statici con nginx
FROM nginx:stable-alpine

# Installiamo envsubst per alpine
RUN apk add --no-cache gettext

COPY --from=build /app/dist /usr/share/nginx/html

# Copio il template della configurazione e lo script di entrypoint
COPY config.js.template /usr/share/nginx/html/config.js.template
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Nginx config con SPA fallback
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]

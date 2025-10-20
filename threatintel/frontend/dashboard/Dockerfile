# Stage build
FROM node:22-alpine AS build


WORKDIR /app

# Ricevo l'argomento per la variabile d'ambiente VITE_APP_API_URL
ARG VITE_APP_API_URL
ENV VITE_APP_API_URL=$VITE_APP_API_URL

COPY package*.json ./
RUN npm install
COPY . .

RUN npm run build

# Stage runtime - serve files statici con nginx
FROM nginx:stable-alpine

COPY --from=build /app/dist /usr/share/nginx/html

# Nginx config con SPA fallback
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

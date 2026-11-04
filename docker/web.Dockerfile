# Frontend statique + proxy /api et /admin vers le backend. Contexte : racine du dépôt.
#   docker build -f docker/web.Dockerfile -t lb-web .
FROM nginx:1.27-alpine

RUN apk add --no-cache python3
WORKDIR /usr/share/nginx/html
# Liste blanche : ni tools/, tests/, demo/ ne sont copiés dans l'image
COPY frontend/*.html frontend/manifest.webmanifest frontend/sw.js frontend/robots.txt frontend/sitemap.xml ./
COPY frontend/assets ./assets
COPY frontend/prestations ./prestations
COPY frontend/data ./data

# En-têtes de sécurité : une seule source (frontend/_headers), convertie en directives nginx
COPY frontend/_headers /tmp/_headers
RUN python3 -c "[print('add_header %s \"%s\" always;' % tuple(l.strip().split(': ', 1))) for l in open('/tmp/_headers') if l.startswith('  ')]" \
    > /etc/nginx/security-headers.conf && rm /tmp/_headers

COPY docker/web.nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

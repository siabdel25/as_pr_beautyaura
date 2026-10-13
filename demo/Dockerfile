# Démo : site statique servi par nginx, fausses données Python régénérées au démarrage.
# Construire depuis la racine du dépôt : docker build -f demo/Dockerfile -t lb-demo .
FROM nginx:1.27-alpine

RUN apk add --no-cache python3 tzdata
ENV TZ=Europe/Paris

WORKDIR /usr/share/nginx/html
# Liste blanche : ni tools/, tests/, docs/, ni manage.py ne sont copiés dans l'image
COPY *.html manifest.webmanifest sw.js robots.txt sitemap.xml ./
COPY assets ./assets
COPY prestations ./prestations
COPY data /opt/demo/base
COPY demo/generate_fake_data.py /opt/demo/generate_fake_data.py
RUN mkdir -p data

# En-têtes de sécurité : une seule source (_headers), convertie en directives nginx
COPY _headers /tmp/_headers
RUN python3 -c "import sys; \
[print('add_header %s \"%s\" always;' % tuple(l.strip().split(': ', 1))) for l in open('/tmp/_headers') if l.startswith('  ')]" \
    > /etc/nginx/demo-headers.conf && rm /tmp/_headers

COPY demo/nginx.conf /etc/nginx/conf.d/default.conf
COPY --chmod=755 demo/entrypoint-donnees.sh /docker-entrypoint.d/40-donnees-demo.sh

EXPOSE 80

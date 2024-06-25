# Local-only image for business-web. The pipeline does NOT build this file; it builds
# platform-tooling/docker/angular/Dockerfile with --build-arg NODE_VERSION=$(cat .nvmrc) --build-arg APP=business-web.
# This one exists so someone on a laptop can produce the same nginx layout without the Artifactory
# mirror. Kept in step by hand, badly. MBZ-1502.
#
#   docker build -t business-web:local --build-arg NPM_REGISTRY=http://host.docker.internal:4873 .
#   docker run -p 4201:8080 business-web:local
#
# node:14 images are not on the GIS approved list any more (GIS-STD-021 rev 6). That is fine for a
# laptop, and it is exactly why the pipeline goes through the shared Dockerfile and the rhel7 agent.

FROM node:14.21.3-bullseye-slim AS build
ARG NPM_REGISTRY=http://localhost:4873
ENV CI=true NG_CLI_ANALYTICS=false NODE_OPTIONS=--max-old-space-size=3072
WORKDIR /workspace
COPY package.json package-lock.json .npmrc ./
# .npmrc points @meridian at 4873 already; only the scope registry is rewritten here.
RUN npm config set @meridian:registry "${NPM_REGISTRY}" && npm ci --no-audit --no-fund
COPY . .
RUN npx ng build --configuration production

FROM nginxinc/nginx-unprivileged:1.24-alpine
ARG GIT_SHA=unknown
LABEL org.opencontainers.image.title="business-web" \
      org.opencontainers.image.revision="${GIT_SHA}" \
      meridian.bank/team="business-digital"
COPY --from=build /workspace/dist/meridian-business /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080

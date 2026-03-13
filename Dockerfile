# 先拉取子项目静态资源
FROM alpine:3.19 AS subprojects
RUN apk add --no-cache git curl unzip

# 传入不同的 CACHEBUST 值可强制重新拉取子项目（如 --build-arg CACHEBUST=$(date +%s)）
ARG CACHEBUST=1

# sfz（照片水印）- 直接克隆即可使用
RUN git clone --depth 1 https://github.com/skOak/sfz.git /tmp/sfz

# sandphoto-react（照片排版）- 自动拉取最新 release 的预构建包
RUN apk add --no-cache jq \
    && DOWNLOAD_URL=$(curl -s https://api.github.com/repos/skOak/sandphoto-react/releases/latest | jq -r '.assets[0].browser_download_url') \
    && curl -L -o /tmp/sandphoto.zip "$DOWNLOAD_URL" \
    && mkdir -p /tmp/sandphoto \
    && unzip /tmp/sandphoto.zip -d /tmp/sandphoto \
    && rm /tmp/sandphoto.zip \
    && sed -i 's|"/assets/|"./assets/|g; s|"/favicon.svg"|"./favicon.svg"|g' /tmp/sandphoto/index.html

FROM node:20.12.2-alpine AS builder
WORKDIR /usr/src
COPY . .
# 在构建前将子项目文件放入 public 目录，让 Nitro 在构建时就能感知到它们
COPY --from=subprojects /tmp/sfz ./public/watermark
COPY --from=subprojects /tmp/sandphoto ./public/sandphoto
RUN corepack enable
RUN pnpm install
RUN pnpm run build

FROM node:20.12.2-alpine
WORKDIR /usr/app
COPY --from=builder /usr/src/dist/output ./output
ENV HOST=0.0.0.0 PORT=4444 NODE_ENV=production
EXPOSE $PORT
CMD ["node", "output/server/index.mjs"]

#!/bin/bash
# NewSnow Docker 镜像构建 & 推送脚本
#
# CACHEBUST 参数说明:
#   Dockerfile 中通过 ARG CACHEBUST 来控制子项目（sfz、sandphoto-react）的缓存失效。
#   Docker 构建时会缓存每一层，如果 git clone 命令没有变化，Docker 会复用缓存而不会拉取最新代码。
#   通过 --build-arg CACHEBUST=$(date +%s) 每次传入不同的时间戳，强制 Docker 重新执行
#   git clone 以获取子项目的最新版本。
#
#   如果子项目没有更新，可以去掉 --build-arg CACHEBUST=... 参数来加速构建（复用缓存层）。
#
# 用法:
#   ./build-push.sh              # 完整构建（强制拉取子项目最新代码）
#   ./build-push.sh --no-cache   # 不使用任何 Docker 缓存，从零构建
#   ./build-push.sh --fast       # 快速构建（复用子项目缓存，适用于仅修改主项目代码）

set -e

IMAGE="docker.io/skoak/newsnow:latest"

# 解析参数
CACHEBUST_ARG="--build-arg CACHEBUST=$(date +%s)"
EXTRA_ARGS=""

for arg in "$@"; do
  case $arg in
    --fast)
      # 快速模式：不传 CACHEBUST，复用子项目缓存
      CACHEBUST_ARG=""
      echo "⚡ 快速模式：跳过子项目更新，复用缓存"
      ;;
    --no-cache)
      EXTRA_ARGS="--no-cache"
      echo "🔄 无缓存模式：从零开始构建"
      ;;
    *)
      echo "未知参数: $arg"
      echo "用法: ./build-push.sh [--fast|--no-cache]"
      exit 1
      ;;
  esac
done

echo "🔨 开始构建镜像: ${IMAGE}"
echo "   平台: linux/amd64, linux/arm64"

docker buildx build \
  --platform linux/amd64,linux/arm64 \
  ${CACHEBUST_ARG} \
  ${EXTRA_ARGS} \
  -t "${IMAGE}" \
  --push \
  .

echo "✅ 构建并推送完成: ${IMAGE}"

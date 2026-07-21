# Build and Push Docker Image Workflow

## Goal
建立 GitHub Actions workflow 來 build and push code-insights 的 Docker image 到 custom registry，使用最新的 Actions 版本。

## Context
- 參考 `infra-config/.github/workflows/build-windmill-worker.yml` 的架構
- code-insights 已有 `Dockerfile` 在根目錄
- 專案使用 pnpm workspace，包含 cli, server, dashboard 三個 package

## Implementation Plan

### Task 1: Create workflow file
建立 `.github/workflows/build-and-push-image.yml` 文件，內容如下:

```yaml
name: Build and Push Docker Image

on:
  push:
    paths:
      - 'Dockerfile'
      - '.dockerignore'
      - 'package.json'
      - 'pnpm-lock.yaml'
      - 'pnpm-workspace.yaml'
      - 'cli/**'
      - 'server/**'
      - 'dashboard/**'
      - '.github/workflows/build-and-push-image.yml'
    branches:
      - main
      - master
  workflow_dispatch:

jobs:
  build-and-push:
    name: Build and Push Image
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Private Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ secrets.MY_REGISTRY_URL }}
          username: ${{ secrets.MY_REGISTRY_USER }}
          password: ${{ secrets.MY_REGISTRY_PASSWORD }}

      - name: Extract metadata (tags, labels) for Docker
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ secrets.MY_REGISTRY_URL }}/firstsun-dev/code-insights/code-insights
          tags: |
            type=raw,value=latest
            type=sha,format=short

      - name: Build and push Docker image
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

## Required Secrets
需要在 GitHub repository 的 Settings 中設定以下 secrets:
- `MY_REGISTRY_URL`: 自訂 registry 的 URL (例如 `registry.example.com`)
- `MY_REGISTRY_USER`: registry 使用者名稱
- `MY_REGISTRY_PASSWORD`: registry 密碼或 token

## Notes
- 使用 `docker/build-push-action@v6` (最新版本)
- 使用 `docker/login-action@v3`，仍需明確提供 `password`
- image tag 包含 `latest` 和 commit sha
- 使用 GitHub Actions cache 加速 build

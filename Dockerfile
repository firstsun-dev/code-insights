# syntax=docker/dockerfile:1

# Code Insights runs `pnpm --filter <pkg> build` across a workspace and links
# packages via `workspace:*`, so the pnpm virtual store layout (node_modules/.pnpm
# + symlinks) has to stay intact between build and runtime — we copy the whole
# pruned workspace rather than trying to hand-pick individual node_modules dirs.

FROM node:22-bookworm-slim AS base
# python3/make/g++ are required to build better-sqlite3 and sqlite-vec (native
# addons) for the container's arch/libc — do not switch the runtime stage to
# an Alpine base without rebuilding here, musl bindings are not compatible.
# corepack's "latest pnpm" fetch needs Node >=22.13 (hence the base bump from
# the repo's engines.node >=18 floor) — pin to the pnpm version this repo was
# authored against so builds don't silently drift to a newer major.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && corepack prepare pnpm@10.33.0 --activate
WORKDIR /app

FROM base AS builder
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY cli/package.json cli/package.json
COPY server/package.json server/package.json
COPY dashboard/package.json dashboard/package.json
ENV CI=true
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm -r build \
    && cp -r dashboard/dist cli/dashboard-dist \
    && cp -r server/dist cli/server-dist

# `pnpm prune --prod` is deliberately NOT run here: in this workspace it wipes
# each package's entire node_modules (not just devDependencies — a known pnpm
# bug with the isolated node-linker layout), which breaks the runtime image.
# The tradeoff is devDependencies (typescript, vitest, ...) ship in the final
# image too.

FROM base AS runtime
ENV NODE_ENV=production
RUN apt-get purge -y python3 make g++ && apt-get autoremove -y

# node:22-bookworm-slim already ships a "node" user at uid/gid 1000 — reuse it
# rather than creating a new one (a fresh uid 1000 would collide with it).
# Override at `docker run`/compose time with `user: "${UID}:${GID}"` to match
# the host user that owns the bind-mounted home directory, otherwise writes to
# ~/.code-insights will fail with EACCES.
USER node

COPY --from=builder --chown=node:node /app /app
WORKDIR /app/cli

EXPOSE 7890
ENTRYPOINT ["node", "dist/index.js"]
CMD ["dashboard", "--no-open", "--port", "7890"]

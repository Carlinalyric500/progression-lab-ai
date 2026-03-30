# Development

## Prerequisites

- Node version aligned with `.nvmrc`
- Yarn package manager
- Docker for local Postgres
- GNU Make

## Local Setup

```bash
make install
cp .env.local.example .env.local
docker-compose up -d
make db-push
make db-seed
make dev
```

Main app URL:

- `http://localhost:3000`

Admin app URL depends on admin config; run with:

```bash
make admin-dev
```

## Common Commands

```bash
make dev
make build
make lint
make lint-fix
make test
make test-e2e
make db-generate
make db-studio
```

## Testing

### Unit and Component

```bash
make test
yarn test:watch
yarn test:coverage
```

### End-to-End

```bash
yarn playwright install chromium
make test-e2e
```

## Storybook

```bash
yarn storybook
yarn build-storybook
```

Use `make help` to list all supported workflow commands. Direct Yarn commands are still available for scripts that are not wrapped by Make targets.

## Related References

- Main README: `README.md`
- Admin docs: `admin-dashboard/README.md`
- Deployment: `DEPLOYMENT.md`

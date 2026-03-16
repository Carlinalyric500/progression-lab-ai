APP_NAME=music-chord-app

install:
	npm install

dev:
	npm run dev

build:
	npm run build

start:
	npm run start

docker-build:
	docker compose build

docker-up:
	docker compose up

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

clean:
	rm -rf .next node_modules

setup-env:
	cp .env.local.example .env.local

help:
	@echo "Available commands:"
	@echo "  make install      Install dependencies"
	@echo "  make dev          Run development server"
	@echo "  make build        Build project"
	@echo "  make start        Run production build"
	@echo "  make docker-dev   Run with Docker"
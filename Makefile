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
.PHONY: up down build logs logs-app shell db-migrate db-seed db-reset db-studio test test-coverage install generate-prisma open-langfuse open-mailpit open-minio open-bullboard status

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f

logs-app:
	docker compose logs -f app

shell:
	docker compose exec app sh

db-migrate:
	docker compose exec app npx prisma migrate dev

db-seed:
	docker compose exec app npx prisma db seed

db-reset:
	docker compose exec app npx prisma migrate reset --force

db-studio:
	docker compose exec app npx prisma studio

test:
	docker compose exec app npm test

test-coverage:
	docker compose exec app npm run test:coverage

install:
	docker compose exec app npm install

generate-prisma:
	docker compose exec app npx prisma generate

open-langfuse:
	open http://localhost:3100

open-mailpit:
	open http://localhost:8025

open-minio:
	open http://localhost:9001

open-bullboard:
	open http://localhost:3001

status:
	docker compose ps

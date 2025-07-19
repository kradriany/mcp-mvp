# Root Makefile for MCP MVP

up:
	docker compose up --build

down:
	docker compose down -v

build:
	docker compose build

lint:
	pre-commit run --all-files

clean:
	docker compose down -v
	rm -rf **/__pycache__ **/*.pyc **/*.pyo **/.pytest_cache **/.mypy_cache

# Run all tests (Python and Node/React)
test:
	cd mcp-server && make test || exit 1
	cd mcp-api && npm test || exit 1
	cd mcp-frontend && npm test || exit 1
	cd opcua-bridge && npm test || exit 1

.PHONY: up down build lint test clean 
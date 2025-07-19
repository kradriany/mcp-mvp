.PHONY: dev test build run clean install lint format

# Development
dev:
	poetry run uvicorn src.mcp_server.main:app --reload --host 0.0.0.0 --port 8080

# Install dependencies
install:
	poetry install

# Run tests
test:
	poetry run pytest tests/ -v --cov=src/mcp_server --cov-report=term-missing

# Linting and formatting
lint:
	poetry run ruff check src/ tests/
	poetry run mypy src/

format:
	poetry run black src/ tests/
	poetry run ruff check --fix src/ tests/

# Docker commands
build:
	docker-compose build

run:
	docker-compose up -d

stop:
	docker-compose down

logs:
	docker-compose logs -f

# Clean up
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type f -name "*.pyd" -delete
	find . -type f -name ".coverage" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".mypy_cache" -exec rm -rf {} +
	find . -type d -name ".ruff_cache" -exec rm -rf {} +

# Generate Poetry lock file
lock:
	poetry lock --no-update

# Show help
help:
	@echo "Available commands:"
	@echo "  make dev        - Run development server with auto-reload"
	@echo "  make install    - Install dependencies with Poetry"
	@echo "  make test       - Run tests with coverage"
	@echo "  make lint       - Run linting checks"
	@echo "  make format     - Format code with black and ruff"
	@echo "  make build      - Build Docker image"
	@echo "  make run        - Run with Docker Compose"
	@echo "  make stop       - Stop Docker containers"
	@echo "  make logs       - Show Docker logs"
	@echo "  make clean      - Clean up cache files"
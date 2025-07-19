# Contributing to MCP MVP

Welcome! This guide will help you get started as a contributor to the MCP MVP project.

---

## Quick Start

1. **Clone the repo:**
   ```sh
   git clone https://github.com/your-org/mcp-mvp.git
   cd mcp-mvp
   ```
2. **Copy and configure environment variables:**
   ```sh
   cp .env.example .env
   # Edit .env as needed for your local/dev setup
   ```
3. **Install pre-commit hooks:**
   ```sh
   python3 -m pip install pre-commit
   pre-commit install
   pre-commit run --all-files
   ```
4. **Build and run the stack (Docker Compose):**
   ```sh
   docker compose up --build
   ```
5. **Access services:** See the root README for ports and URLs.

---

## Local Development
- Each service has its own README for local (non-Docker) setup.
- Use `.env` files for configuration. Never commit secrets or real `.env` files.
- Run tests and linting with pre-commit or npm scripts as appropriate.

---

## Linting & Formatting
- Pre-commit hooks enforce code style (Black, Ruff, ESLint, Prettier, etc).
- Run manually with:
  ```sh
  pre-commit run --all-files
  ```
- Fix any issues before committing.

---

## Testing
- Run all tests before pushing:
  - Python: `make test` or `pytest` in `mcp-server`
  - Node/React: `npm test` in each service directory
- CI will run all tests on every PR.

---

## Branching & PRs
- Use feature branches: `feature/your-feature`, `bugfix/your-bug`, etc.
- Write clear, descriptive commit messages.
- Open a pull request against `main`.
- Ensure all checks pass before requesting review.

---

## Adding a New Service or Endpoint
- Scaffold your service in a new directory under the project root (or `services/` if used).
- Add a Dockerfile and .dockerignore.
- Add a README with setup and usage instructions.
- Add tests and ensure they pass.
- Update the root README and architecture diagram if needed.

---

## More Resources
- See the root README for architecture, service overview, and troubleshooting.
- For questions, open an issue or ask in the project chat. 
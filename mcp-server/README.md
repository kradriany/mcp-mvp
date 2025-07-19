# MCP Server

## Quick Start Checklist

1. **Generate the Scaffold**
   - Use Claude (or your preferred codegen tool) to generate the Python scaffold.
   - You should have a structure like:
     ```
     mcp-server/
     ├── pyproject.toml
     ├── src/
     │   ├── core/
     │   ├── adapters/
     │   ├── schemas/
     │   └── cli/
     ├── tests/
     ├── docker-compose.yml
     └── README.md
     ```

2. **Clone Context Repos**
   - In `mcp-server/`, clone your own and official MCP repos into a `_context/` folder:
     ```sh
     git clone --depth=1 https://github.com/yourorg/your-repo-1 _context/your-repo-1
     git clone --depth=1 https://github.com/yourorg/your-repo-2 _context/your-repo-2
     git clone --depth=1 https://github.com/modelcontextprotocol/modelcontextprotocol _context/modelcontextprotocol
     git clone --depth=1 https://github.com/modelcontextprotocol/python-sdk _context/python-sdk
     ```
   - The scaffold should include a `load_external_context()` helper to ingest these files.

3. **Install Dependencies**
   - Run:
     ```sh
     poetry install
     ```

4. **Configure Secrets**
   - Edit `src/core/config.py` (look for `🔧 EDIT ME` markers).
   - Add API keys, broker URLs, etc., as environment variables or in a `.env` file.
   - Ensure `.env` is in `.gitignore`.

5. **Run the Server Locally**
   - With Makefile:
     ```sh
     make dev
     ```
   - Or directly:
     ```sh
     uvicorn src.main:app --reload --port 8080
     ```
   - You should see:
     ```
     INFO  Started server process […]
     INFO  Uvicorn running on http://0.0.0.0:8080 (Press CTRL+C to quit)
     ```

6. **Smoke-Test the API**
   - Try:
     ```sh
     curl http://localhost:8080/status/some-id
     curl -X POST http://localhost:8080/connect \
          -H 'Content-Type: application/json' \
          -d '{"adapter":"mqtt","params":{"host":"broker.example.com","topic":"test"}}'
     curl http://localhost:8080/status/<returned-uuid>
     curl http://localhost:8080/sample/<returned-uuid>
     ```
   - You should see agent-friendly text responses like:
     ```
     Connection configured but unreachable: retrying back-off=4 s
     ```

7. **Run with Docker Compose**
   - Start everything:
     ```sh
     docker compose up --build
     ```
   - Logs will stream in JSONL; check HTTP endpoints for summaries.

8. **Iterate and Extend**
   - Add more adapters under `src/adapters/` (Serial, gRPC, HTTP-Push, WebSockets, etc.).
   - Write unit tests in `tests/`.
   - Add observability (OpenTelemetry, Prometheus).
   - Update the README with real protocol examples.

---

This directory contains the Python backend service for the MCP MVP project.

## Structure
- `src/` - Source code
- `tests/` - Unit tests
- `Dockerfile`, `docker-compose.yml` - Containerization
- `pyproject.toml` - Python dependencies

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
   or use Poetry if configured:
   ```bash
   poetry install
   ```
2. Run the server (example):
   ```bash
   python -m mcp_server.main
   ```

## Development
- Use the Makefile for common tasks.
- See code in `src/mcp_server/` for main logic.
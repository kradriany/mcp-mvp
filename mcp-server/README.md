# MCP Server

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
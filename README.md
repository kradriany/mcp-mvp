12345678906969
# MCP MVP

This repository contains the Minimum Viable Product (MVP) for the MCP project, including backend services, infrastructure as code, and API definitions.

---

## Architecture Diagram

```mermaid
graph TD;
  subgraph User
    F[Browser/Client]
  end
  subgraph Cloud
    direction TB
    A[MCP Frontend (React)]
    B[MCP API (Node.js)]
    C[OPC UA Bridge (Node.js)]
    D[Perlin OPC UA Server (Node.js)]
    E[MCP Server (FastAPI)]
  end
  F -->|HTTP| A
  A -->|REST/HTTP| B
  A -->|REST/HTTP| C
  A -->|REST/HTTP| E
  C -->|OPC UA| D
```

---

## Service Overview

| Service         | Description                | Port(s) | Docker Image         | Healthcheck         |
|----------------|---------------------------|---------|----------------------|---------------------|
| mcp-server     | Python FastAPI backend     | 8080    | mcp-server           | /health             |
| mcp-api        | Node.js REST API mock      | 4000    | mcp-api              | /api-docs           |
| mcp-frontend   | React UI                   | 3100    | mcp-frontend         | /                   |
| opcua-bridge   | Node.js OPC UA bridge      | 4001    | opcua-bridge         | /opcua/latest       |
| perlin         | Node.js OPC UA server      | 4840    | perlin               | OPC UA endpoint     |

---

## Getting Started (Docker Compose)

1. **Build and start all services:**
   ```sh
   docker compose up --build
   ```
2. **Access services:**
   - Frontend: http://localhost:3100
   - MCP API: http://localhost:4000
   - OPC UA Bridge: http://localhost:4001/opcua/latest
   - Perlin OPC UA: opc.tcp://localhost:4840
   - MCP Server: http://localhost:8080
3. **Stop all services:**
   ```sh
   docker compose down -v
   ```

---

## Local Development
- See the README in each subdirectory for setup and usage instructions.
- Use `.env` files for configuration (see each service's README for required variables).
- Run tests and linting with pre-commit or npm scripts as appropriate.

---

## Troubleshooting
- **Port conflicts:** Make sure no other processes are using the same ports.
- **CORS issues:** Check browser console and ensure all services are running.
- **OPC UA node not found:** Ensure Perlin server exposes `ns=1;s=PerlinValue`.
- **Docker build slow:** Make sure `.dockerignore` is present in each service.
- **Healthchecks:** Visit `/health` or `/opcua/latest` endpoints to verify service status.

---

## Contributing & Best Practices
- Use pre-commit hooks for linting/formatting.
- Keep `.env` files out of git.
- See `CONTRIBUTING.md` for more details (if present).
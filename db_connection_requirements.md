# Neo4j Database Connection & Gemini Integration

This document outlines the requirements and steps for connecting to the Arcane Majesty production database hosted on `scarif.lan` and integrating it with Gemini CLI.

## 1. Production Host Details

*   **Database Host:** `scarif.lan` (192.168.0.159)
*   **Bolt Port:** `7687` (Client connections)
*   **Browser Port:** `7474` (Web interface)

## 2. Credentials

*   **Username:** `neo4j`
*   **Password:** `vwnx6h8g`

## 3. Required Software & Tools

### a. `uv` (Python Package Manager)
Used for managing Python environments and the Neo4j driver.
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### b. `pipx` & MCP Neo4j Cypher
Required for Gemini CLI to interact with the graph via the Model Context Protocol (MCP).
```bash
sudo apt install pipx
pipx ensurepath
pipx install mcp-neo4j-cypher
```

### c. Neo4j Python Driver (for scripting)
```bash
uv pip install neo4j
```

---

## 4. Connection Method: Gemini CLI (MCP Server)

To allow Gemini CLI to query and modify the graph, add the following to your MCP configuration:

```json
"mcpServers": {
  "neo4j": {
    "command": "/home/etienne/.local/bin/uvx",
    "args": [
      "--with",
      "fastmcp<0.4.1",
      "mcp-neo4j-cypher",
      "--transport",
      "stdio"
    ],
    "env": {
      "NEO4J_URI": "bolt://192.168.0.159:7687",
      "NEO4J_USERNAME": "neo4j",
      "NEO4J_PASSWORD": "vwnx6h8g",
      "NEO4J_DATABASE": "neo4j"
    }
  }
}
```

---

## 5. Connection Method: Python Scripting

Use the following example to interact with the database programmatically:

```python
import os
from neo4j import GraphDatabase

uri = "bolt://192.168.0.159:7687"
user = "neo4j"
password = "vwnx6h8g"

def run_query(query):
    with GraphDatabase.driver(uri, auth=(user, password)) as driver:
        with driver.session() as session:
            return session.run(query).data()

# Example usage
print(run_query("MATCH (n:Character) RETURN n.name"))
```

---

**For local development setup instructions, see [data/neo4j/neo4j_setup.md](data/neo4j/neo4j_setup.md).**
**For graph schema and architecture details, see [neo4j_architecture.md](neo4j_architecture.md).**

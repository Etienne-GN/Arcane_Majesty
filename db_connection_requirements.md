# Neo4j Database Connection Requirements

This document outlines the necessary components and credentials for connecting to the Arcane Majesty Neo4j database hosted on `scarif.lan` from a Debian-based system, without relying on Docker for the client.

## 1. Host Details

*   **Database Host:** `scarif.lan`
*   **Bolt Port:** `7687` (used for client connections)

## 2. Credentials

The following credentials are required to authenticate with the database:

*   **URI:** `bolt://scarif.lan:7687`
*   **Username:** `neo4j`
*   **Password:** `vwnx6h8g`

These credentials are currently stored in `data/scripts/run_mcp_server.sh` as environment variables.

## 3. Required Software & Tools

To interact with the database natively, the following software needs to be installed on the client host:

### a. Python 3

Ensure Python 3 is installed on your system. It's typically pre-installed on Debian-based systems.

*   **Verification:** `python3 --version`

### b. `uv` (Python Package and Project Manager)

`uv` is used for efficient management of Python environments and dependencies, including the Neo4j Python driver.

*   **Installation:**
    ```bash
    curl -LsSf https://astral.sh/uv/install.sh | sh
    # Ensure uv is added to your PATH, e.g., by adding the following to your shell profile (.bashrc, .zshrc):
    # export PATH="$HOME/.cargo/bin:$PATH"
    ```

### c. Neo4j Python Driver

The official Python driver for Neo4j.

*   **Installation (using `uv`):**
    ```bash
    uv pip install neo4j
    ```

## 4. Connection Method: Using a Python Script

This method involves writing a Python script that uses the installed Neo4j driver to connect to the remote database and execute Cypher queries.

**Example Python Script (`connect_neo4j.py`):**
```python
import os
from neo4j import GraphDatabase

# Retrieve credentials from environment variables (set by run_mcp_server.sh or manually)
uri = os.environ.get("NEO4J_URI", "bolt://scarif.lan:7687")
username = os.environ.get("NEO4J_USERNAME", "neo4j")
password = os.environ.get("NEO4J_PASSWORD", "vwnx6h8g")

driver = None
try:
    # Create a Neo4j driver instance
    driver = GraphDatabase.driver(uri, auth=(username, password))
    
    # Verify connectivity to the database
    driver.verify_connectivity()
    print("Connection to Neo4j successful!")

    # Execute a sample query
    with driver.session() as session:
        result = session.run("MATCH (n) RETURN count(n) AS nodeCount")
        for record in result:
            print(f"Total nodes in the database: {record['nodeCount']}")

except Exception as e:
    print(f"Failed to connect to Neo4j or execute query: {e}")
finally:
    # Close the driver connection
    if driver:
        driver.close()
```

**How to run the script:**

1.  **Set Environment Variables:** Ensure `NEO4J_URI`, `NEO4J_USERNAME`, and `NEO4J_PASSWORD` are set in your environment (e.g., by sourcing `data/scripts/run_mcp_server.sh` or setting them manually).
    ```bash
    source data/scripts/run_mcp_server.sh # If in project root
    # Or manually:
    # export NEO4J_URI="bolt://scarif.lan:7687"
    # export NEO4J_USERNAME="neo4j"
    # export NEO4J_PASSWORD="vwnx6h8g"
    ```
2.  **Execute Python Script:**
    ```bash
    python3 connect_neo4j.py
    ```

## 5. Next Steps

By following these steps, you will have a native Python environment configured to connect to and interact with the Neo4j database on `scarif.lan`. This setup provides flexibility for scripting and application development without Docker dependencies for the client.

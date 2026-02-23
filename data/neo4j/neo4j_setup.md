# Setting up Neo4j for Local Development

This document outlines the steps to set up a local Neo4j database using Docker for development and testing.

## Prerequisites

*   [Docker](https://docs.docker.com/get-docker/) installed on your system.
*   [uv](https://astral.sh/uv) installed on your system.

## Running the Neo4j Container

To run a local Neo4j container with the APOC plugin, execute the following command:

```bash
docker run \
    --name neo4j-apoc \
    -p 7474:7474 -p 7687:7687 \
    -v neo4j_data:/data \
    -v ./apoc.conf:/etc/neo4j/apoc.conf \
    -e NEO4J_AUTH=neo4j/your_password \
    -e NEO4J_PLUGINS='["apoc"]' \
    neo4j:latest
```

### APOC Configuration

Create an `apoc.conf` file in your working directory:

```
apoc.import.file.enabled=true
apoc.export.file.enabled=true
apoc.import.file.use_neo4j_config=true
```

## Accessing the Local Instance

Access the Neo4j Browser at `http://localhost:7474`. Log in with username `neo4j` and the password you set.

---

## Database Management: Exporting and Importing Data

### Exporting Data

1.  **Execute the dump command inside the container:**
    ```bash
    docker exec neo4j-apoc neo4j-admin dump --database=neo4j --to=/data/databases/neo4j.dump
    ```

2.  **Copy the dump file to your host machine:**
    ```bash
    docker cp neo4j-apoc:/data/databases/neo4j.dump ./neo4j.dump
    ```

### Importing Data

1.  **Run a temporary container to load the dump file:**
    ```bash
    docker run \
        --name neo4j-import \
        -e NEO4J_AUTH=neo4j/your_password \
        -v ./neo4j.dump:/var/lib/neo4j/data/databases/neo4j.dump \
        -v neo4j_data:/data \
        neo4j:latest \
        neo4j-admin load --from=/var/lib/neo4j/data/databases/neo4j.dump --database=neo4j --force
    ```

2.  **Start your main container using the loaded volume.**

---

**For connecting to the production database or configuring Gemini CLI, see [db_connection_requirements.md](../../db_connection_requirements.md).**

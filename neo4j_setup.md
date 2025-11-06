# Setting up Neo4j with Docker

This document outlines the steps to set up a local Neo4j database using Docker. This setup includes the APOC plugin and a persistent volume for the database.

## Prerequisites

*   [Docker](https://docs.docker.com/get-docker/) installed on your system.

## Running the Neo4j Container

To run the Neo4j container, execute the following command in your terminal:

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

### Command Breakdown

*   `docker run`: The command to run a Docker container.
*   `--name neo4j-apoc`: Assigns a name to your container, making it easier to reference.
*   `-p 7474:7474`: Maps port 7474 on your host to port 7474 in the container (for Neo4j Browser).
*   `-p 7687:7687`: Maps port 7687 on your host to port 7687 in the container (for the Bolt protocol).
*   `-v neo4j_data:/data`: Creates a Docker named volume called `neo4j_data` and mounts it to the `/data` directory inside the container. This ensures your database files persist even if the container is removed.
*   `-v ./apoc.conf:/etc/neo4j/apoc.conf`: Mounts the `apoc.conf` file from your local directory to the `/etc/neo4j/` directory in the container.
*   `-e NEO4J_AUTH=neo4j/your_password`: Sets the initial username (`neo4j`) and password for your database. **Change `your_password` to a secure password.**
*   `-e NEO4J_PLUGINS='["apoc"]'`: This environment variable instructs the Neo4j Docker image to download and install the APOC plugin.
*   `neo4j:latest`: Specifies the Docker image to use. You can replace `latest` with a specific Neo4j version (e.g., `neo4j:5.10.0`).

## APOC Configuration

Create a file named `apoc.conf` in the same directory where you are running the `docker run` command. Add the following line to the file to allow APOC to execute any procedure:

```
apoc.import.file.enabled=true
apoc.export.file.enabled=true
apoc.import.file.use_neo4j_config=true
```

## Accessing Neo4j

After running the container, you can access the Neo4j Browser by navigating to `http://localhost:7474` in your web browser. You will be prompted to log in with the username `neo4j` and the password you set in the `docker run` command.

## Gemini Integration

To connect Gemini to the Neo4j database, you will need to provide the following connection details:

*   **Host:** `localhost`
*   **Port:** `7687`
*   **Username:** `neo4j`
*   **Password:** The password you set in the `docker run` command.

This information will be used to configure the Neo4j connection within the Gemini application.

### Gemini Extension Configuration

To enable Gemini to interact with Neo4j, you need to configure the `mcp-neo4j` extension. Create or update the file `~/.gemini/extensions/mcp-neo4j/gemini-extension.json` with the following content:

```json
{
  "name": "mcp-neo4j",
  "version": "1.0.0",
  "mcpServers": {
    "mcp-neo4j-cypher": {
      "command": "/home/etienne/data/projects/arcane_majesty/utils/run_mcp_server.sh",
      "args": [ "mcp-neo4j-cypher" ]
    },
    "mcp-neo4j-data-modeling": {
      "command": "/home/etienne/data/projects/arcane_majesty/utils/run_mcp_server.sh",
      "args": [ "mcp-neo4j-data-modeling" ]
    }
  }
}
```

**Important:** Ensure that the `run_mcp_server.sh` script exists at the specified path: `/home/etienne/data/projects/arcane_majesty/utils/run_mcp_server.sh`.

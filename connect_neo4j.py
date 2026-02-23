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

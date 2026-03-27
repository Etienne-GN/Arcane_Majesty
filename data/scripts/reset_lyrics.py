from neo4j import GraphDatabase

# Database Configuration
URI = "bolt://192.168.0.159:7687"
USER = "neo4j"
PASSWORD = "vwnx6h8g"

def reset_lyrics():
    driver = GraphDatabase.driver(URI, auth=(USER, PASSWORD))
    with driver.session() as session:
        print("Resetting lyrics for all songs in Neo4j...")
        session.run("""
            MATCH (s:Song)
            SET s.lyrics = "Lyrics will be available soon (rework in progress)."
        """)
    driver.close()
    print("Neo4j lyrics reset complete.")

if __name__ == "__main__":
    reset_lyrics()

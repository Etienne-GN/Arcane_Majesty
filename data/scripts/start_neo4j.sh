#!/bin/bash
docker run -d \
    --name neo4j-apoc \
    -p 7474:7474 -p 7687:7687 \
    -v /home/etienne/projects/arcane_majesty/neo4j_db:/data \
    -v /home/etienne/projects/arcane_majesty/data/neo4j/apoc.conf:/etc/neo4j/apoc.conf \
    -e NEO4J_AUTH=neo4j/vwnx6h8g \
    -e NEO4J_PLUGINS='["apoc"]' \
    neo4j:latest

#!/bin/bash
export NEO4J_URI="bolt://scarif.lan:7687"
export NEO4J_USERNAME="neo4j"
export NEO4J_PASSWORD="vwnx6h8g"
export FASTMCP_STATELESS_HTTP=True
uvx "$@"

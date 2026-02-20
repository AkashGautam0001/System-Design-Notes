#!/bin/bash
# This script is mounted into the MongoDB container's initdb directory.
# The healthcheck in docker-compose.yml handles rs.initiate() automatically.
# This file exists as a fallback / documentation.

echo "MingleSphere MongoDB starting..."
echo "Replica set initialization is handled by the healthcheck."

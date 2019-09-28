#!/usr/bin/env bash
echo "releasing new version..." &&
./scripts/semantic_release.sh &&
echo "deployment successful"

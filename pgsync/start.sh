#! /bin/sh
# Prevent checkpoint file from being deleted, at some point move to dedicated setup with prisma migration
CHECKPOINT_PATH=/dev/null bootstrap --config ./schema.json
echo 'Bootstrap done, ignore checkpoint file warnings'
pgsync --config ./schema.json -d
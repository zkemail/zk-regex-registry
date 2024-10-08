#!/bin/bash
source .env

if [ ! -d "$BUILD_DIR" ]; then
    echo "No build directory found. Creating build directory..."
    mkdir -p "$BUILD_DIR"
fi

echo '****COMPILING CIRCUIT****'
start=$(date +%s)
set -x
circom "$CIRCUIT" --r1cs --wasm --output "$BUILD_DIR/$" -l "../node_modules"
{ set +x; } 2>/dev/null
end=$(date +%s)
echo "DONE ($((end - start))s)"
echo
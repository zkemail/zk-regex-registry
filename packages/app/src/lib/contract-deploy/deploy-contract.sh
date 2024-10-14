#!/bin/bash

input_dir=$1

echo "Input Directory: $input_dir"

# Check if forge is installed
if ! command -v forge &> /dev/null
then
    echo "forge could not be found"
    exit 1
fi

# install deps and compile contract
cd $input_dir
yarn install
forge script Deploy.s.sol --rpc-url $RPC_URL --broadcast --chain-id $CHAIN_ID --verify
rm -rf node_modules
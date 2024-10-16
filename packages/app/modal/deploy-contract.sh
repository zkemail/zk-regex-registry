#!/bin/bash

input_dir=$1
rpc_url=$2
chain_id=$3

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
forge script Deploy.s.sol --rpc-url $rpc_url --broadcast --chain-id $chain_id --verify
rm -rf node_modules
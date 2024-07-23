#!/bin/bash

input_dir=$1
output_dir="$(pwd)/$2"

echo "Input Directory: $input_dir"
echo "Output Directory: $output_dir"

# Check if forge is installed
if ! command -v forge &> /dev/null
then
    echo "forge could not be found"
    exit 1
fi

# make sure output dir is created
mkdir -p $output_dir


# install deps and compile contract
cd $input_dir
yarn install
forge build -o $output_dir
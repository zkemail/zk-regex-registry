#!/bin/bash

# Usage: ./auto_restart_wrapper.sh "your_command_here"

if [ $# -eq 0 ]; then
    echo "Usage: $0 <command>"
    echo "Please provide the command to run as an argument."
    exit 1
fi

# The command to run, passed as an argument
command_to_run="$1"

# Function to run the command
run_command() {
    echo "Running command: $command_to_run"
    eval "$command_to_run"
}

# Main loop
while true; do
    run_command

    if [ $? -eq 0 ]; then
        echo "Command completed successfully. Exiting."
        break
    else
        echo "Command failed. Restarting in 5 seconds..."
        sleep 5
    fi
done

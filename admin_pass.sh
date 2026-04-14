#!/bin/bash

# Define where to store the password securely
STORE_FILE="$HOME/.laptop_admin_pass"

if [ "$1" == "set" ]; then
    # Prompt for password but hide it while typing (-s flag)
    read -s -p "Enter laptop admin password: " PWD
    echo "" # Print a newline after user presses Enter
    
    # Save the password to the file
    echo "$PWD" > "$STORE_FILE"
    
    # Make sure only the current user can read/write to this file for security
    chmod 600 "$STORE_FILE"
    
    echo "Successfully"
    
elif [ "$1" == "get" ]; then
    # Check if we have a saved password
    if [ -f "$STORE_FILE" ]; then
        echo "The saved laptop admin password is:"
        cat "$STORE_FILE"
    else
        echo "Warning: No password has been saved yet. Run './admin_pass.sh set' first."
    fi
    
else
    echo "Usage:"
    echo "  ./admin_pass.sh set   - To enter and save the password secretly"
    echo "  ./admin_pass.sh get   - To view the saved password"
fi

#!/bin/bash
# Script to assemble instruction chunks into current_instructions.md
# This script should be run from the directory where it resides:
# prompts/travel-system-instructions/v6_simplified/

# Define the output file
OUTPUT_FILE="current_instructions.md"

# Define the input files in order.
# Based on the request for "4 chunks", these files are assumed.
# If 00_role_and_goal.md should be included, or a different set of files,
# please modify this list accordingly.
FILES_TO_CONCATENATE=(
    "00_role_and_goal.md"
    "01_tools_overview_updated.md"
    "02_knowledge_and_schema.md"
    "03_database_tables.md"
    "04_database_views.md"
    "05_activity_log_protocol.md"
    "06_client_maintenance_flow.md"
    "07_accuracy_and_verification.md"
)

# Basic check for current directory name to guide user
EXPECTED_DIR_NAME="v6_simplified"
CURRENT_DIR_NAME=$(basename "$PWD")

if [ "$CURRENT_DIR_NAME" != "$EXPECTED_DIR_NAME" ]; then
  echo "Warning: This script is intended to be run from a directory named '$EXPECTED_DIR_NAME',"
  echo "which should contain this script and the .md files to be assembled."
  echo "You are currently in '$PWD'."
  echo "Proceeding, but ensure the .md files are in the current directory if you run it from here."
fi


echo "Assembling $OUTPUT_FILE from the following files (expected in $PWD):"

ASSEMBLED_CONTENT=""
first_file=true

for file in "${FILES_TO_CONCATENATE[@]}"; do
    if [ -f "$file" ]; then
        echo "- Processing $file"

        # Read file content
        FILE_CONTENT=$(cat "$file")

        if [ "$first_file" = true ]; then
            ASSEMBLED_CONTENT="$FILE_CONTENT"
            first_file=false
        else
            # Add separator before appending next file's content
            # Using \n\n---\n\n which renders as a horizontal rule in Markdown with spacing.
            ASSEMBLED_CONTENT="${ASSEMBLED_CONTENT}\n\n---\n\n${FILE_CONTENT}"
        fi
    else
        echo "Warning: File '$file' not found in the current directory ($PWD). Skipping."
    fi
done

if [ -n "$ASSEMBLED_CONTENT" ]; then
    # Use printf to correctly handle potential special characters in ASSEMBLED_CONTENT
    # and ensure a final newline.
    printf "%s\n" "$ASSEMBLED_CONTENT" > "$OUTPUT_FILE"
    echo "$OUTPUT_FILE has been created successfully in $PWD."
else
    echo "No files were found or processed. $OUTPUT_FILE not created or is empty."
fi

echo ""
echo "To use this script:"
echo "1. Navigate to the 'prompts/travel-system-instructions/v6_simplified/' directory."
echo "2. Make the script executable: chmod +x assemble_instructions.sh"
echo "3. Run the script: ./assemble_instructions.sh"

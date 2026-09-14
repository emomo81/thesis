#!/bin/sh
cd "$(dirname "$0")" || exit 1
python3 launch.py
status=$?
if [ "$status" -ne 0 ]; then
    printf '\nPress Enter to close…'
    read -r answer
fi
exit "$status"

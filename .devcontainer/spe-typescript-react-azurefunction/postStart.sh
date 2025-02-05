#!/bin/bash

# Make React client and Azure function API ports public
gh codespace ports visibility 8080:public 7072:public -c $CODESPACE_NAME

# Set the API URL in the environment if needed
API_URL="$(gh codespace ports -c $CODESPACE_NAME --json sourcePort,browseUrl --jq '.[] | select(.sourcePort==7072).browseUrl')"
API_URL+="/api"
if [$REACT_APP_SAMPLE_API_URL != API_URL]; then
    SET_VAR_CMD="export REACT_APP_SAMPLE_API_URL=${API_URL}"
    echo $SET_VAR_CMD >> ~/.bashrc
fi

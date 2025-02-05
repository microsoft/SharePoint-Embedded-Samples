#!/bin/bash

gh codespace ports visibility 8080:public 7072:public -c $CODESPACE_NAME

export REACT_APP_SAMPLE_API_URL="$(gh codespace ports -c $CODESPACE_NAME --json sourcePort,browseUrl --jq '.[] | select(.sourcePort==7072).browseUrl')"


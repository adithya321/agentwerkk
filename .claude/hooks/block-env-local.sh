#!/bin/bash
python3 -c "
import sys, json
data = json.load(sys.stdin)
fp = data.get('tool_input', {}).get('file_path', '')
if '.env.local' in fp:
    print('BLOCKED: .env.local is write-protected. Edit it manually.', file=sys.stderr)
    sys.exit(2)
"

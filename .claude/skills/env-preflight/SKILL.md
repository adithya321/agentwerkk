---
name: env-preflight
description: Check all required .env.local vars are set before starting the pipeline. Run before demo or first pipeline execution.
disable-model-invocation: true
---

Run the preflight check:

```bash
bash scripts/check-env.sh
```

If any vars are missing, the script prints which ones and exits non-zero. Fix them in `.env.local` before proceeding.

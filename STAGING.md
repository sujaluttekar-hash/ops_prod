# Staging Environment

## Setup (one-time, in Vercel dashboard)

1. Go to **Vercel → ops-prod → Settings → Git**
2. Under "Production Branch" — confirm it's set to `main`
3. Vercel automatically creates preview deployments for all other branches

## How to use staging

```bash
# Create and push to staging branch
git checkout -b staging
git push origin staging
```

Vercel will deploy to: `ops-prod-staging-sujals-projects-0d52b5a2.vercel.app`

## Workflow

```
feature work  →  staging branch  →  test on staging URL  →  merge to main  →  production
```

## Current environments
| Branch  | URL                          | Who uses it      |
|---------|------------------------------|------------------|
| main    | ops-prod.vercel.app          | Butlers (live)   |
| staging | ops-prod-git-staging-*.vercel.app | Testing only |

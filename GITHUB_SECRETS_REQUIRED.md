# Required GitHub Secrets

The following secrets need to be added to your GitHub repository for the CI/CD pipeline to work correctly:

## API Keys
- `PERPLEXITY_API_KEY` - Required for the Perplexity research integration tests and health checks

## How to Add
1. Go to your GitHub repository
2. Click on Settings > Secrets and variables > Actions
3. Click "New repository secret"
4. Add the secret name and value
5. Click "Add secret"

## Current Status
As of the latest CI run, the PERPLEXITY_API_KEY is missing, causing the Perplexity health check to fail in GitHub Actions.
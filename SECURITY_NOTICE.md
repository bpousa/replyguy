# IMPORTANT SECURITY NOTICE

## Exposed API Keys

The following API keys were accidentally exposed in git history and need to be rotated immediately:

1. **OpenAI API Key** - Found in previous commits
2. **Anthropic API Key** - Found in previous commits  
3. **Stripe API Key** - Found in .env.example (now removed)

## Actions Required

1. **Rotate all API keys immediately:**
   - Go to https://platform.openai.com/api-keys and revoke the old key, create a new one
   - Go to https://console.anthropic.com/settings/keys and rotate the key
   - Go to https://dashboard.stripe.com/apikeys and roll the secret key

2. **Update Vercel environment variables** with the new keys

3. **Update local .env.local** with the new keys

4. **Never commit .env files** or files containing real API keys

## Prevention

- Always use .env.example with empty values for documentation
- Add all .env files to .gitignore
- Use Vercel's environment variables UI for production secrets
- Consider using git-secrets or similar tools to prevent accidental commits
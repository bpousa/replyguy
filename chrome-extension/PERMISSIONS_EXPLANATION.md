# Reply Guy Chrome Extension - Permissions Explanation

## Required Permissions

### 1. Cookies Permission (`"cookies"`)
**Why we need it:**
- To authenticate your Reply Guy account with our servers
- To maintain your premium subscription status
- To keep you logged in between browser sessions

**What we do with it:**
- Read authentication cookies from replyguy.appendment.com only
- Never access cookies from Twitter/X or other sites
- Used solely for secure API communication

**What happens without it:**
- You would need to log in every time you use the extension
- Premium features wouldn't work reliably

### 2. Storage Permission (`"storage"`)
**Why we need it:**
- To save your "Write Like Me" custom writing examples
- To remember your preferences (default tone, reply length, etc.)
- To cache your writing style for 24 hours for better performance

**What we store:**
- Your custom writing style examples (locally, never sent to servers)
- Your preference settings
- Temporary cache of generated replies
- Feature usage preferences

**What happens without it:**
- You'd lose all settings when closing the browser
- "Write Like Me" wouldn't work
- Every action would be slower

### 3. Host Permissions

#### `"*://*.twitter.com/*"` and `"*://*.x.com/*"`
**Why we need it:**
- To add the Reply Guy button to Twitter/X reply boxes
- To read the tweet you're replying to for context
- To insert generated replies into the compose box
- To display the Reply Guy interface within Twitter/X

**What we do:**
- Only activate when you click a reply button
- Only read the specific tweet you're replying to
- Never collect or store your Twitter/X data

#### `"*://*.appendment.com/*"` and `"*://*.replyguy.appendment.com/*"`
**Why we need it:**
- To communicate with Reply Guy AI servers
- To verify your subscription status
- To process your reply generation requests
- To fetch your account information

**What we do:**
- Send only the data you explicitly submit
- Use secure HTTPS connections
- Process requests only when you click "Generate"

## Privacy Commitment

- **No Background Activity**: The extension only works when you actively use it
- **No Data Collection**: We don't collect your tweets or browsing history
- **Local Storage**: Your personal data stays on your device
- **Explicit Actions Only**: Nothing happens without your click
- **Minimal Permissions**: We only request what's absolutely necessary

## Security Measures

- All data transmission uses HTTPS encryption
- Authentication tokens expire and refresh automatically
- Local storage is encrypted by your browser
- No third-party services have access to your data
- Regular security audits and updates

## Questions?

If you have any concerns about permissions or privacy, please contact us at privacy@appendment.com
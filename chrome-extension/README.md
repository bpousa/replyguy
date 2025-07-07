# Reply Guy Chrome Extension

## Overview

The Reply Guy Chrome extension brings the full dashboard experience directly into X (Twitter), allowing users to generate AI-powered replies without leaving the social media platform. The extension automatically detects the user's subscription plan and shows/hides features accordingly.

## Current Status

As of January 2025, the Chrome extension provides:
- ✅ Full authentication with Supabase (cookie-based)
- ✅ Reply Guy button injection on all tweets
- ✅ Comprehensive overlay UI matching the main dashboard
- ✅ Plan-based feature gating
- ✅ All core Reply Guy features (reply generation, memes, research, etc.)
- ✅ Write Like Me™ integration
- ✅ Perplexity research (Business plan)

## Architecture

### Key Files and Locations

```
chrome-extension/
├── public/
│   └── manifest.json              # Chrome extension manifest (v3)
├── src/
│   ├── background/
│   │   └── index.ts              # Background service worker
│   ├── content/
│   │   ├── index.ts              # Content script entry point
│   │   ├── twitter-integration.ts # X/Twitter DOM manipulation
│   │   └── suggestions-overlay.ts # Main UI overlay component
│   ├── services/
│   │   ├── api.ts                # API communication service
│   │   └── auth.ts               # Authentication service
│   └── types/
│       └── index.ts              # TypeScript type definitions
├── dist/                         # Built extension files (gitignored)
├── package.json                  # Dependencies and build scripts
└── webpack.config.js             # Webpack configuration
```

### Core Components

#### 1. **Twitter Integration** (`src/content/twitter-integration.ts`)
- Monitors DOM for new tweets using MutationObserver
- Injects Reply Guy button next to each tweet's reply button
- Handles button clicks and opens the suggestions overlay
- Manages authentication state checks

Key methods:
- `initialize()` - Sets up observer and initial injection
- `injectReplyButtons()` - Finds and decorates reply buttons
- `handleReplyGuyClick()` - Opens overlay with tweet context
- `createReplyGuyIcon()` - Creates the RG button with inline styles

#### 2. **Suggestions Overlay** (`src/content/suggestions-overlay.ts`)
- Renders the full Reply Guy UI as an overlay
- Implements all dashboard features in a compact design
- Handles form state and user interactions
- Manages API calls for reply generation

Key methods:
- `showOptions()` - Displays the main UI with user's plan features
- `showLoading()` - Loading state during generation
- `showGeneratedReply()` - Displays the generated reply and optional meme
- `insertIntoTwitter()` - Inserts reply into X's compose box

UI Sections:
- Tweet preview (collapsible)
- Response type selector (4 options with emojis)
- Tone selector (10 options with emojis)
- Response idea textarea with AI suggestion button
- Advanced options (reply length, Perplexity research)
- Fun extras (meme generator)

#### 3. **API Service** (`src/services/api.ts`)
- Communicates with Reply Guy backend
- Handles all API endpoints
- Manages authentication tokens
- Implements error handling and retries

Key endpoints:
- `/api/suggest` - AI suggestions for response ideas
- `/api/suggest-research` - Research topic suggestions
- `/api/generate` - Main reply generation
- `/api/meme/generate` - Meme generation
- `/api/usage` - User's usage limits and plan

#### 4. **Authentication** (`src/services/auth.ts`)
- Manages Supabase authentication
- Handles cookie-based sessions
- Checks authentication status
- Opens login page when needed

### Authentication Flow

1. Extension checks for Supabase session cookies on `.appendment.com` domain
2. Cookies are automatically included with `credentials: 'include'`
3. Backend validates session and returns user data
4. If not authenticated, prompts user to log in

**Important**: The manifest.json must include:
```json
"host_permissions": [
  "*://*.twitter.com/*",
  "*://*.x.com/*",
  "*://*.appendment.com/*",
  "*://*.replyguy.appendment.com/*"
]
```

### Feature Implementation

#### Plan-Based Features

The extension checks the user's plan and conditionally shows:

```typescript
// Free Plan ($0/mo)
- ✅ Basic reply generation (10/month)
- ✅ All response types and tones
- ❌ AI suggestions
- ❌ Memes
- ❌ Long replies
- ❌ Style matching
- ❌ Perplexity research
- ❌ Write Like Me

// Basic Plan ($19/mo)
- ✅ 300 replies/month
- ✅ AI suggestions (50/month)
- ✅ Meme generation (10/month)
- ✅ Style matching (50% influence)
- ❌ Long replies
- ❌ Perplexity research
- ❌ Write Like Me

// Pro Plan ($49/mo)
- ✅ 500 replies/month
- ✅ Long replies (up to 1000 chars)
- ✅ Write Like Me™
- ✅ Unlimited AI suggestions
- ✅ 50 memes/month
- ❌ Perplexity research

// Business Plan ($99/mo)
- ✅ 1000 replies/month
- ✅ All features including Perplexity research
- ✅ 100 memes/month
- ✅ Priority support
```

### API Request Format

The extension sends a comprehensive request to `/api/generate`:

```typescript
{
  tweet: string,              // Original tweet text
  responseIdea: string,       // User's response idea
  responseType: string,       // agree/disagree/neutral/other
  tone: string,              // Selected tone
  replyLength?: string,      // short/medium/long
  needsResearch?: boolean,   // Include Perplexity research
  perplexityGuidance?: string, // Research guidance
  includeMeme?: boolean,     // Generate meme
  memeText?: string,        // Custom meme text
  memeTextMode?: string,    // exact/enhance
  useCustomStyle?: boolean  // Use Write Like Me
}
```

### Build Process

```bash
# Install dependencies
cd chrome-extension
npm install

# Development build (watches for changes)
npm run dev

# Production build
npm run build

# The built extension will be in the dist/ folder
```

### Loading in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `chrome-extension/dist` folder
5. The extension will appear in your extensions list

### Testing Checklist

1. **Authentication**:
   - Visit https://replyguy.appendment.com and log in
   - Verify extension shows authenticated state

2. **Button Injection**:
   - Navigate to X.com
   - Verify RG buttons appear next to reply buttons
   - Check button styling (purple gradient, "RG" text)

3. **Feature Visibility**:
   - Test with different plan levels
   - Verify correct features show/hide

4. **Reply Generation**:
   - Test all input fields
   - Verify API calls succeed
   - Check reply insertion into X

5. **Error Handling**:
   - Test with network disconnected
   - Test with expired session
   - Verify user-friendly error messages

### Common Issues and Solutions

#### Issue: Authentication not working
```
Solution:
- Check manifest.json has *.appendment.com in host_permissions
- Verify cookies are set on .appendment.com domain
- Check CORS headers on /api/auth/extension endpoint
- Ensure credentials: 'include' is set on fetch calls
```

#### Issue: Buttons not appearing
```
Solution:
- X.com frequently changes their DOM structure
- Check selectors in findReplyButtons() method
- Current selectors:
  - [data-testid="reply"]
  - [aria-label*="Reply"]
  - [role="button"][aria-label*="Reply"]
- Use DevTools to find new selectors if needed
```

#### Issue: Overlay positioning issues
```
Solution:
- The overlay is appended to the reply compose area
- Check that X hasn't changed their compose box structure
- Look for [data-testid="tweetTextarea_0_label"]
```

#### Issue: Styles not applying
```
Solution:
- Use inline styles instead of classes
- X's CSS can override extension styles
- All styles are defined in getComprehensiveStyles()
```

### Development Guidelines

1. **DOM Manipulation**:
   - Always use specific selectors with fallbacks
   - Handle cases where elements don't exist
   - Use MutationObserver for dynamic content

2. **Performance**:
   - Debounce MutationObserver callbacks (500ms)
   - Limit DOM queries
   - Cache element references when possible

3. **Error Handling**:
   - Show user-friendly error messages
   - Log detailed errors to console
   - Provide actionable next steps

4. **Feature Flags**:
   - Always check user plan before showing features
   - Handle plan upgrades/downgrades gracefully
   - Show upgrade prompts for locked features

5. **Styling**:
   - Use inline styles to avoid conflicts
   - Test on both light and dark X themes
   - Ensure mobile responsiveness

### Security Considerations

1. **Content Security Policy**: 
   - Extension only injects on twitter.com and x.com
   - No external scripts loaded

2. **API Communication**:
   - All requests use HTTPS
   - Authentication via httpOnly cookies
   - No API keys stored in extension

3. **User Data**:
   - No user data stored locally
   - All processing done server-side
   - Minimal permissions requested

4. **DOM Access**:
   - Limited to tweet content and compose areas
   - No access to user's private messages
   - No modification of user's tweets

### Debugging Tips

1. **Enable Debug Logging**:
   ```javascript
   // Add to background script
   chrome.storage.local.set({ debug: true });
   ```

2. **View Logs**:
   - Content script: Page's DevTools console
   - Background script: chrome://extensions → Details → Service worker

3. **Common Log Prefixes**:
   - `[ReplyGuy]` - General logs
   - `[Auth]` - Authentication related
   - `[API]` - API calls
   - `[Inject]` - DOM injection

4. **Network Debugging**:
   - Use DevTools Network tab
   - Check for CORS errors
   - Verify cookie headers

### Future Enhancements

1. **Keyboard Shortcuts** 
   - Cmd/Ctrl+Shift+R to open Reply Guy
   - Tab navigation in overlay

2. **Bulk Operations**
   - Generate multiple reply variations
   - Queue replies for scheduling

3. **Thread Support**
   - Intelligent thread continuation
   - Context awareness across threads

4. **Analytics Integration**
   - Track which replies get engagement
   - A/B testing for reply effectiveness

5. **Template System**
   - Save successful reply patterns
   - Quick access to frequently used styles

6. **Multi-Platform Support**
   - LinkedIn integration
   - Reddit integration
   - Instagram comments

### Performance Metrics

Monitor these metrics for optimal performance:
- Button injection time: < 1 second
- Overlay render time: < 100ms
- API response time: < 3 seconds
- Memory usage: < 50MB

### Release Process

1. Update version in `manifest.json` and `package.json`
2. Run production build: `npm run build`
3. Test all features thoroughly
4. Create ZIP of `dist` folder
5. Upload to Chrome Web Store
6. Update documentation

### Support

For issues or questions:
- GitHub Issues: [replyguy/issues](https://github.com/replyguy/issues)
- Email: support@replyguy.app
- Discord: [Join our community](https://discord.gg/replyguy)

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Maintainers**: Reply Guy Development Team
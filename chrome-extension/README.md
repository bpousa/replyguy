# Reply Guy Chrome Extension

This directory contains the source code for the Reply Guy Chrome Extension.

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the extension:
   ```bash
   npm run build
   ```

3. Load the extension in Chrome:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" 
   - Click "Load unpacked"
   - Select the `dist` folder

4. For development with hot reload:
   ```bash
   npm run dev
   ```

## Architecture

- **TypeScript + Webpack**: Modern build pipeline
- **React**: For popup UI
- **Content Scripts**: Inject Reply Guy into Twitter/X
- **Background Service Worker**: Handle API calls and authentication
- **Supabase Auth**: Uses existing web app cookies

## Current Status

✅ Completed by Claude:
- TypeScript/Webpack build system
- Authentication with Supabase cookies
- API service layer for all endpoints
- Basic Twitter DOM interaction
- Background service worker
- Basic popup component structure

⏳ Pending for Gemini:
- Enhanced popup UI with branding
- Injected button styling
- Suggestions overlay UI
- Loading states and animations
- Usage limit displays with progress bars

## Testing

1. Ensure you're logged into Reply Guy web app first
2. Navigate to Twitter/X
3. Look for "Reply Guy" button in compose areas
4. Click extension icon to see popup with usage limits

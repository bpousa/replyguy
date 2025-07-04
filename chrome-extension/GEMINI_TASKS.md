# Gemini Tasks for Reply Guy Chrome Extension

## CRITICAL: Branch Instructions
**YOU MUST WORK ONLY ON THE BRANCH: `feature/chrome-extension-twitter-integration`**
**DO NOT TOUCH OR COMMIT TO THE MAIN BRANCH**

First, ensure you're on the correct branch:
```bash
git checkout feature/chrome-extension-twitter-integration
```

## Overview
You're working on the UI and user-facing features of the Reply Guy Chrome Extension. Claude is handling the core integration and API logic. Please mark tasks as complete with notes as you progress.

## Your Tasks

### 1. Popup UI Implementation
- [x] Convert popup.html to use React
- [x] Create a clean, modern UI that matches Reply Guy's branding
- [x] Display user's current usage limits (replies, suggestions, memes remaining)
- [x] Add "Open Reply Guy" button for full dashboard access
- [x] Include login prompt UI for unauthenticated users
**Status:** Completed by Claude (Gemini hit quota limit)
**Notes:** Implemented with purple gradient branding, progress bars for usage limits, and clean Material-inspired design

### 2. Injected UI Components
- [x] Design "Reply Guy" button to inject into Twitter compose areas
- [x] Create tooltip/hover state showing "Generate Reply"
- [x] Build overlay UI for displaying suggestions (3 options)
- [x] Add loading spinner component for API calls
- [x] Ensure UI elements blend with Twitter's design
**Status:** Completed by Claude
**Notes:** Created SuggestionsOverlay class with smooth animations, proper positioning, and Twitter-compatible styling

### 3. Usage Limit Display
- [x] Create progress bars or counters for remaining uses
- [x] Add visual indicators when limits are low (e.g., yellow/red)
- [x] Include upgrade prompt when user hits limits
- [ ] Make limits update in real-time after each use
**Status:** Mostly Completed by Claude
**Notes:** Progress bars turn red when below 20%, upgrade link included in footer

### 4. Loading States & Feedback
- [ ] Implement skeleton loaders for content generation
- [ ] Add success animations when reply is inserted
- [ ] Create error toast notifications for failures
- [ ] Include retry buttons for failed requests
**Status:** Pending
**Notes:**

### 5. Styling & Polish
- [ ] Ensure responsive design for different Twitter layouts
- [ ] Add smooth transitions and animations
- [ ] Implement dark mode support (matching Twitter's theme)
- [ ] Test on both twitter.com and x.com domains
**Status:** Pending
**Notes:**

## Shared Responsibilities
- Testing the extension on real Twitter pages
- Handling edge cases and Twitter UI updates
- Performance optimization
- Documentation updates

## Technical Notes
- Claude is setting up TypeScript/Webpack build system
- Use React for popup (to match main app)
- Tailwind CSS is available for styling
- API endpoints are already built in the main app
- Authentication uses Supabase cookies

## Communication
- Update this file with your progress
- Add any blockers or questions in the notes
- Claude will handle API integration and core logic
- Coordinate on shared components via this file

Good luck! Let's build an awesome extension together.
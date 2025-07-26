# Reply Guy Chrome Extension v1.2.0 Release Notes

## What's New in Version 1.2.0

### 🎯 Major Improvements

#### 1. **Auto-Focus Text Input**
- The "What do you want to say?" textbox now automatically receives focus when the overlay opens
- No more needing 2-3 clicks to start typing - just open Reply Guy and start writing immediately
- Improved timing to prevent focus conflicts with other UI elements

#### 2. **Twitter-Style Formatting**
- Generated replies now include proper line breaks between thoughts
- Paragraphs are formatted with 1-3 sentences for optimal mobile readability
- No more walls of text - replies look natural and are easy to read on phones
- Line breaks are preserved and displayed correctly in the extension

#### 3. **Enhanced Security**
- Added sender validation to prevent unauthorized cross-extension communication
- Removed overly broad host permissions
- More secure message handling in the background service worker

#### 4. **Better Error Handling**
- Replaced disruptive alert() popups with inline error messages
- Errors now appear within the UI without blocking your workflow
- Clearer error messages to help you understand what went wrong

#### 5. **Improved Code Quality**
- Extracted 1700+ lines of inline CSS into a separate, maintainable stylesheet
- Added source maps for development builds to aid debugging
- Removed redundant JavaScript files
- Better organized codebase for future updates

### 🔧 Bug Fixes

#### 1. **Fixed Edit Mode Character Limit**
- When editing a generated reply, you're no longer restricted to the original reply's character count
- Character limits now properly adjust based on the reply type (short, medium, long, extra-long)
- Edit mode now shows the appropriate character limit for your reply type

#### 2. **User Feedback Integration**
- Your edits to generated replies are now properly sent to improve your writing style
- The "Write Like Me" feature learns from your corrections
- Style improvements will be reflected in future generations

### 📝 Technical Details

- **Version**: 1.2.0
- **Manifest Version**: 3 (latest Chrome extension standard)
- **Compatibility**: Chrome, Edge, and other Chromium-based browsers
- **Security**: Enhanced with sender validation and restricted permissions

### 🚀 How to Update

1. Download the new version (replyguy-chrome-extension-v1.2.0.zip)
2. Extract the zip file
3. Open Chrome and go to chrome://extensions/
4. Enable "Developer mode" (top right)
5. Click "Load unpacked" and select the extracted folder
6. Or wait for the automatic update through Chrome Web Store

### 💡 Tips for Best Experience

- **Auto-Focus**: Just click the Reply Guy button and start typing immediately
- **Formatting**: Your replies will automatically be formatted with proper paragraph breaks
- **Edit Mode**: Feel free to edit longer or shorter - no more artificial character restrictions
- **Feedback**: Edit generated replies to match your style - the system learns from your changes

---

## Summary

Version 1.2.0 focuses on usability improvements and security enhancements. The auto-focus feature eliminates friction when starting a reply, while Twitter-style formatting ensures your generated content looks natural and readable. Combined with security improvements and bug fixes, this update provides a smoother, safer experience for all Reply Guy users.
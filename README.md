# Chronicle — Complete App (All 5 Phases)
### Your personal offline newspaper-style blog for Android

---

## 🏁 What's Complete

All 5 phases are done. Chronicle is a fully featured personal blog app.

---

## 📱 Full Feature List

### Writing
- Rich text editor with formatting toolbar (Format / Insert / Style tabs)
- Bold, italic, strikethrough, inline code
- Headings H1 / H2 / H3
- Blockquotes, bullet lists, numbered lists, checklists (interactive)
- Code blocks, horizontal rules
- Insert images from gallery
- Undo / redo (50 levels)
- Live markdown preview toggle
- Fullscreen distraction-free mode
- Auto-save drafts
- Word count + reading time

### Organisation
- Categories: Journal, Tech, Creative, Other
- Tags (comma separated)
- Pin posts to top
- Full-text search
- Filter by category
- Archive view — posts grouped by month, collapsible
- Draft vs Published status

### 10 Themes
Broadsheet · Vintage Gazette · Dark Ink · Modern Minimal · Tabloid ·
Magazine · Academic · Typewriter · Neon Cyberpunk · Soft Diary

### Theme Customisation
- 12 accent colour presets + custom hex input
- Body font size (13–22pt)
- Line spacing (Compact / Normal / Relaxed / Airy)
- Per-theme settings saved separately

### Stats
- Writing streak (🔥 day counter)
- Total posts, drafts, words
- Category breakdown bar chart
- Average words per post

### Sharing & Export
- **PDF export** — fully themed newspaper layout, two columns, drop cap
- **3 clipping styles** — Classic, Torn, Modern card
- **6 social platforms** — Twitter/X, WhatsApp, Telegram, Instagram, LinkedIn, Facebook
- Copy to clipboard
- Share as plain text
- Share as Markdown
- **Publish to Medium** — via Integration Token API (saves as draft)
- **Publish to Substack** — copy content + open composer

### Backup & Restore
- Export all posts as JSON backup (re-importable)
- Export all posts as single Markdown file
- Import from JSON backup
- **Google Drive backup** — OAuth2, "Chronicle Backups" folder, backup history

### Security
- Biometric lock (fingerprint / Face ID)
- Auto-lock when app goes to background
- Device PIN fallback

### Notifications
- Daily writing reminders
- 5 quick time presets (Morning / Midday / Afternoon / Evening / Night)
- Custom hour + minute picker
- Streak celebration notifications

---

## 🚀 Getting Started (5 minutes)

### 1. Install dependencies
```bash
cd Chronicle
npm install
```

### 2. Install Expo packages
```bash
npx expo install expo-auth-session expo-clipboard expo-crypto \
  expo-document-picker expo-file-system expo-image-picker \
  expo-local-authentication expo-notifications expo-print \
  expo-sharing expo-sqlite expo-web-browser
```

### 3. Run on your phone
```bash
npx expo start
```
Install **Expo Go** on your Android phone → scan the QR code.

### 4. Build a real APK
```bash
npm install -g eas-cli
eas login
eas build:configure

# Installable APK (no Play Store needed)
eas build -p android --profile preview
```

---

## ⚙️ Optional Setup

### Medium Publishing
1. Go to medium.com → Settings → Security → Integration Tokens
2. Create a token named "Chronicle"
3. Paste it in Chronicle → Settings → Publishing → Medium

### Google Drive Backup
1. Go to console.cloud.google.com
2. Create a project, enable Google Drive API
3. Create OAuth 2.0 credentials (Android)
4. Paste Client ID in Chronicle → Settings → Google Drive Backup

### Writing Reminders
Settings → Notifications → Writing Reminders → pick your time

### Biometric Lock
Settings → Security → toggle on (requires fingerprint/Face ID enrolled on device)

---

## 📂 Project Structure

```
Chronicle/
├── App.js                           ← Root: lock screen + app state
├── app.json                         ← Expo config + permissions
├── package.json                     ← All dependencies
├── src/
│   ├── screens/
│   │   ├── HomeScreen.js            ← Feed: feature card + list
│   │   ├── ComposeScreen.js         ← Rich text editor
│   │   ├── PostScreen.js            ← Read post (markdown rendered)
│   │   ├── ShareScreen.js           ← Share hub: PDF, clipping, social
│   │   ├── PublishScreen.js         ← Medium + Substack publishing
│   │   ├── ArchiveScreen.js         ← Monthly archive
│   │   ├── ThemesScreen.js          ← 10 theme picker
│   │   ├── ThemeCustomizeScreen.js  ← Accent, font, spacing
│   │   ├── StatsScreen.js           ← Writing stats + streak
│   │   ├── SettingsScreen.js        ← Full settings hub
│   │   ├── BackupScreen.js          ← JSON/MD export + import
│   │   ├── DriveBackupScreen.js     ← Google Drive backup
│   │   └── RemindersScreen.js       ← Daily writing reminders
│   ├── components/
│   │   ├── FormatToolbar.js         ← 3-tab formatting toolbar
│   │   ├── MarkdownRenderer.js      ← Rich content renderer
│   │   └── LockScreen.js            ← Biometric lock UI
│   ├── editor/
│   │   └── richText.js              ← Markdown parser + format helpers
│   ├── sharing/
│   │   ├── pdfGenerator.js          ← Themed PDF export
│   │   ├── clippingGenerator.js     ← 3 newspaper clipping styles
│   │   ├── socialShare.js           ← 6 social platform share functions
│   │   ├── publishService.js        ← Medium API + Substack helper
│   │   └── driveBackup.js           ← Google Drive OAuth + upload
│   ├── services/
│   │   ├── notifications.js         ← Daily reminder scheduling
│   │   └── biometricLock.js         ← Lock/auth logic
│   ├── themes/
│   │   ├── themes.js                ← 10 theme definitions
│   │   └── ThemeContext.js          ← Theme provider + context
│   ├── storage/
│   │   └── db.js                    ← SQLite: all queries + archive
│   └── navigation/
│       └── AppNavigator.js          ← 4-tab + full stack navigator
```

---

## 🗺️ Phase Summary

| Phase | Status | What was built |
|-------|--------|----------------|
| 1 | ✅ | Core app, 10 themes, feed, editor, stats |
| 2 | ✅ | Rich text editor, markdown, format toolbar, undo/redo, preview |
| 3 | ✅ | Archive, theme customisation, backup/restore, settings |
| 4 | ✅ | PDF, 3 clipping styles, 6 social platforms, share hub |
| 5 | ✅ | Medium/Substack publish, Google Drive, reminders, biometric lock |

**Chronicle is complete.**

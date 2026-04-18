# Kiara's Learning App - 24 Hour Setup Guide

## Quick Start (Next 24 Hours)

### Step 1: GitHub Setup (5 min)

1. **Go to GitHub**: https://github.com
2. **Create new repository**:
   - Name: `kiara-app` (or any name)
   - Description: "Learning app for Kiara"
   - Public (so you can share link with family)
   - ✅ Add README

3. **Clone to your computer**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/kiara-app.git
   cd kiara-app
   ```

4. **Add all project files**:
   - Copy all files from this folder into your `kiara-app` folder
   - (Except `.git` folder - keep that!)

5. **Commit and push**:
   ```bash
   git add .
   git commit -m "Initial commit: Kiara's learning app MVP"
   git push origin main
   ```

---

### Step 2: Deploy to Vercel (5 min)

1. **Go to Vercel**: https://vercel.com
2. **Log in** (use GitHub account)
3. **Import project**:
   - Click "New Project"
   - Select your `kiara-app` repository
   - Click "Import"
4. **Configure** (leave all defaults):
   - Framework: Detected automatically
   - Build Command: `npm run build`
   - Click "Deploy"

✅ **Vercel will deploy automatically!** You'll get a URL like `https://kiara-app-XXX.vercel.app`

---

### Step 3: Share with Family (2 min)

Once deployed, **share this link**:
```
https://your-vercel-url.vercel.app
```

Everyone can:
- Click "Start Lesson" to work with Kiara
- Click "Parent Dashboard" to see progress

---

## Testing Locally (Before Deploying)

### Install & Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Visit: http://localhost:3000

---

## Architecture

```
kiara-app/
├── src/
│   ├── App.jsx              # Main app (home, lesson selector)
│   ├── App.css
│   ├── components/
│   │   ├── MathLesson1.jsx  # Addition lesson
│   │   ├── MathLesson1.css
│   │   ├── ParentDashboard.jsx
│   │   └── ParentDashboard.css
│   ├── api/
│   │   └── kvSync.js        # Save/load progress
│   └── utils/
│       └── voiceAgent.js    # Mrs. Love voice (TTS)
├── api/
│   └── progress.js          # Serverless function (Vercel)
├── index.html
├── package.json
└── vite.config.js
```

---

## Features in MVP

✅ **Math Lesson 1: Addition**
- Drag-drop objects
- Family member scenarios (Daddy, Mommy, Kelani, etc.)
- Mrs. Love voice feedback (TTS)
- 5 problems per session
- Score tracking

✅ **Parent Dashboard**
- See all session scores
- Calculate average %
- Share link with family
- Works across devices

✅ **Real-Time Sync**
- Progress saves to localStorage immediately
- Syncs to server when online
- Works offline

---

## Next Steps (Phase 2 - After 24h)

- [ ] Reading module (phonics, letter recognition)
- [ ] Advanced reversal practice (b/d, p/q)
- [ ] Randomization engine
- [ ] Claude AI integration
- [ ] Email progress reports
- [ ] Teacher dashboard (for Mrs. Glassband)

---

## Troubleshooting

**Q: Vercel deployment fails?**
A: Check GitHub for error messages. Make sure all files are committed.

**Q: App not loading on Android?**
A: Open link in browser (not in-app). Check internet connection.

**Q: Voice not working?**
A: Voice uses browser's built-in Text-to-Speech. May not work on some browsers/devices. Check if "play sounds" is enabled.

**Q: Progress not saving?**
A: Data saves locally in browser. Check localStorage in DevTools.

---

## Production Setup (Vercel KV)

When ready for real-time sync across devices:

1. **Enable Vercel KV**:
   - Go to Vercel Dashboard
   - Select your project
   - Go to "Storage" → "Create Database" → "KV"

2. **Add env variables** (Vercel will do this automatically):
   - `KV_REST_API_TOKEN`
   - `KV_REST_API_URL`

3. **Update `/api/progress.js`** to use KV instead of in-memory storage:
   ```javascript
   import { kv } from '@vercel/kv';
   
   // In POST handler:
   await kv.lpush(`progress:${studentId}`, JSON.stringify(sessionData))
   
   // In GET handler:
   const sessions = await kv.lrange(`progress:${studentId}`, 0, -1)
   ```

---

**You're ready to build! Questions?**
- GitHub docs: https://docs.github.com
- Vercel docs: https://vercel.com/docs
- Vite docs: https://vitejs.dev

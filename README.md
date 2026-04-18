# 📚 Kiara's Learning App with Mrs. Love

A voice-first, interactive learning app for Kiara (5 years old, kindergarten) built in 24 hours!

## 🎯 What It Does

**Math Lesson 1: Addition**
- Learn "putting things together" concept
- Drag-drop objects
- Family member scenarios (Daddy, Mommy, Kelani, etc.)
- Mrs. Love gives voice feedback (warm, encouraging)
- 5 problems per session
- Real-time progress tracking

**Parent Dashboard**
- See all session scores
- Track average performance
- Share progress link with family
- Works on any device (Android, iOS, desktop)

---

## 🚀 Quick Start (24 Hours)

### Step 1: Deploy to Vercel
```bash
# Clone repo
git clone https://github.com/YOUR_USERNAME/kiara-app.git
cd kiara-app

# Push to GitHub (Vercel will auto-deploy)
git add .
git commit -m "Initial commit"
git push origin main

# Then go to https://vercel.com and connect your GitHub repo
# Vercel will automatically build and deploy!
```

**See DEPLOY_NOW.md for detailed step-by-step instructions** ⭐

### Step 2: Test Locally
```bash
npm install
npm run dev
# Visit http://localhost:3000
```

### Step 3: Share Link
Once deployed, share the Vercel URL with family. Everyone can:
- Click "Start Lesson" to practice with Kiara
- Click "Parent Dashboard" to see her progress

---

## 📱 Features

### For Kiara
✅ Voice-first interface (Mrs. Love speaks all instructions)  
✅ Large, touch-friendly buttons  
✅ Bright, engaging colors  
✅ Celebration sounds & animations  
✅ No time pressure - she controls pace  
✅ Short sessions (5 problems = 5-10 min)  
✅ Family member scenarios (personalizes learning)  

### For Parents/Grandparents
✅ Real-time progress dashboard  
✅ See which problems she solved correctly  
✅ Track average % score  
✅ Share link with entire family  
✅ Works across all devices  
✅ Data syncs in real-time  

---

## 🏗️ Architecture

**Frontend**: React 18 + Vite (fast, modern)  
**Voice**: Web Speech API (browser TTS, Mrs. Love voice)  
**Storage**: localStorage (offline) + Vercel serverless API  
**Deployment**: Vercel (automatic from GitHub)  

```
Client (React App)
    ↓
Vercel Edge Network
    ↓
Serverless API (/api/progress.js)
    ↓
In-Memory Storage (Phase 1) / Vercel KV (Phase 2)
```

---

## 📂 Project Structure

```
kiara-app/
├── src/
│   ├── App.jsx                    # Main app (home page, router)
│   ├── App.css
│   ├── main.jsx
│   ├── api/
│   │   └── kvSync.js              # Save/load progress
│   ├── components/
│   │   ├── MathLesson1.jsx        # Addition lesson (5 problems)
│   │   ├── MathLesson1.css
│   │   ├── ParentDashboard.jsx    # Progress tracker
│   │   └── ParentDashboard.css
│   └── utils/
│       └── voiceAgent.js          # Mrs. Love voice (TTS)
├── api/
│   └── progress.js                # Vercel serverless function
├── index.html
├── package.json
├── vite.config.js
├── vercel.json                    # Vercel config
└── DEPLOY_NOW.md                  # 👈 START HERE FOR DEPLOYMENT
```

---

## 👩‍🏫 Mrs. Love Character

- **Name**: Mrs. Love
- **Age**: 40-50 years old, African American woman
- **Accent**: Caribbean (warm, conversational)
- **Tone**: Encouraging, confident, firm when needed
- **Voice**: Browser's Text-to-Speech (female)
- **Personality**: 
  - "What letter this is, Kiara?" (conversational)
  - "Yes, yes! You getting it now!" (enthusiastic)
  - "Mrs. Love so proud of you, baby!" (warm, loving)

---

## 🎮 How Lessons Work

### Addition Lesson Flow

1. **Intro**: Mrs. Love introduces the concept
2. **Problem**: See two groups of objects + family member scenario
3. **Interact**: Drag objects together or type answer
4. **Feedback**: Immediate voice response from Mrs. Love
5. **Celebrate**: Correct answers get celebration sounds
6. **Repeat**: 5 problems total (can adjust in code)
7. **Summary**: Show final score with encouragement

---

## 🔧 Customization

### Change Family Members
In `MathLesson1.jsx`, line ~8:
```javascript
const FAMILY_MEMBERS = [
  'Daddy', 'Mommy', 'Kelani', 'Grandma', 'Grandpa', 'Nay',
  'Uncle Jair', 'GG', 'Jasmine', 'French Fries', 'Marcello'
]
```

### Change Objects
In `MathLesson1.jsx`, line ~12:
```javascript
const OBJECTS = ['🍎', '🎈', '🧸', '🍪', '⭐', '🌸', '🚗']
```

### Change Problem Count
In `MathLesson1.jsx`, adjust the `step <= 5` condition (currently 5 problems per session)

### Change Mrs. Love's Voice
In `voiceAgent.js`:
```javascript
utterance.pitch = 1.2;      // Higher = more feminine
utterance.rate = 0.9;       // Lower = slower
```

---

## 📊 Progress Tracking

### What Gets Saved
```javascript
{
  lesson: "math-lesson-1",
  correctAnswers: 4,
  totalProblems: 5,
  timestamp: "2026-04-18T18:30:00Z"
}
```

### Where It's Stored
1. **Locally**: Browser's localStorage (works offline)
2. **Server**: Vercel API → in-memory storage (Phase 1)
3. **Production**: Vercel KV (Phase 2, when enabled)

### Dashboard Shows
- Total sessions
- Total correct answers  
- Average score %
- Recent session list with timestamps

---

## 🚀 Deployment

### Local Testing
```bash
npm install
npm run dev
```

### Deploy to Vercel
See **DEPLOY_NOW.md** for step-by-step instructions.

**Vercel automatically**:
- Builds the app
- Deploys every time you push to GitHub
- Gives you a live URL

**Share the URL** with family - everyone can access it!

---

## 📱 Mobile-Friendly

✅ Fully responsive design  
✅ Touch-friendly buttons (no hover states)  
✅ Large text & objects  
✅ Works on phones, tablets, desktops  
✅ Tested on Android Chrome  

---

## 🔮 Phase 2 (Planned)

- [ ] Reading module (letter recognition)
- [ ] Phonics support (sound-out help)
- [ ] Letter reversal practice (b/d, p/q, etc.)
- [ ] Rhyming games
- [ ] Sight words
- [ ] Randomization engine (no repeating lessons)
- [ ] Claude AI integration (adaptive feedback)
- [ ] Teacher dashboard (for Mrs. Glassband)
- [ ] Email progress reports
- [ ] Vercel KV real-time sync
- [ ] Advanced analytics

---

## 🐛 Troubleshooting

### Voice not working?
- Check browser volume
- Try different browser (Chrome best)
- Read prompts out loud yourself

### Progress not saving?
- Check localhost:3000 in DevTools (F12 → Application → Local Storage)
- Reload page and try again

### App not loading on Android?
- Check internet connection
- Try refreshing (swipe down)
- Try different browser (Chrome recommended)

### Deployment failed?
- Check GitHub for commit success
- Check Vercel dashboard for build errors
- Try redeploying (go to Vercel dashboard, click "Redeploy")

---

## 📞 Support

**Issue with code?** Check `SETUP.md` and `DEPLOY_NOW.md`  
**Deployment help?** See Vercel docs: https://vercel.com/docs  
**GitHub help?** See GitHub docs: https://docs.github.com  

---

## 📄 License

This project is built for Kiara! ❤️

---

## 🎉 Let's Build!

**Start here**: `DEPLOY_NOW.md` (step-by-step deployment guide)

**Then test with Kiara**: 4-7 PM today!

**Share with family**: Use the dashboard link

Let's help Kiara learn! 📚✨

---

**Built with ❤️ for Kiara**  
*Mrs. Love's Learning App*

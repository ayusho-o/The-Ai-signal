# ⚡ Quick Start Guide

## 🎯 Your App is Running!

**Local URL:** http://localhost:3000

---

## 🚀 Deploy to Vercel (5 minutes)

### Step 1: Run Setup Script
```powershell
.\setup-deployment.ps1
```

### Step 2: Follow Prompts
- Create GitHub repository
- Push code
- Deploy to Vercel

### Step 3: Add API Keys to Vercel
Go to Vercel Dashboard → Settings → Environment Variables:

```
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
GROQ_API_KEY=your_groq_key_here
GEMINI_API_KEY=your_gemini_key_here
GOOGLE_AI_API_KEY=your_google_ai_key_here
```

**Copy your actual keys from `.env.local` file**

---

## 🧪 Test It Now

1. Open: http://localhost:3000
2. Enter this prompt:
   ```
   Build a CRM for a real estate agency. Agents manage leads, properties, and deals. Admin sees analytics.
   ```
3. Click **Generate**
4. Watch the 3-stage pipeline complete!

---

## 📦 What's Configured

✅ All API keys active
✅ 4 AI providers (OpenAI, Anthropic, Groq, Gemini)
✅ 3-stage pipeline (Intent → Schema → AppSpec)
✅ Automatic fallbacks
✅ Real-time SSE streaming
✅ Frontend bug fixed
✅ Ready for Vercel deployment

---

## 📚 Need More Info?

- **Full Setup Details:** `SETUP-COMPLETE.md`
- **Deployment Guide:** `DEPLOYMENT.md`
- **Project Docs:** `README.md`

---

**You're all set! 🎉**

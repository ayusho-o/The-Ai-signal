# Deployment Guide - OneAtlas Pipeline

## 🚀 Quick Deploy to Vercel

### Step 1: Install Git (if not already installed)
Download and install Git from: https://git-scm.com/download/win

### Step 2: Initialize Git Repository
```bash
git init
git add .
git commit -m "Initial commit - OneAtlas Pipeline"
```

### Step 3: Create GitHub Repository
1. Go to https://github.com/new
2. Create a new repository (e.g., `oneatlas-pipeline`)
3. **Do NOT** initialize with README, .gitignore, or license

### Step 4: Push to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/oneatlas-pipeline.git
git branch -M main
git push -u origin main
```

### Step 5: Deploy to Vercel
1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your GitHub repository
4. Vercel will auto-detect Next.js settings
5. **Add Environment Variables** in Vercel dashboard:
   - `OPENAI_API_KEY`
   - `ANTHROPIC_API_KEY`
   - `GROQ_API_KEY`
   - `GEMINI_API_KEY`
   - `GOOGLE_AI_API_KEY`

6. Click "Deploy"

### Step 6: Environment Variables Setup

In Vercel Dashboard → Your Project → Settings → Environment Variables, add:

```
OPENAI_API_KEY=your_openai_key_here

ANTHROPIC_API_KEY=your_anthropic_key_here

GROQ_API_KEY=your_groq_key_here

GEMINI_API_KEY=your_gemini_key_here

GOOGLE_AI_API_KEY=your_google_ai_key_here
```

**Note:** Use your actual API keys from `.env.local` file (do not commit that file to GitHub)

---

## 🔄 Alternative: Using Vercel CLI

### Install Vercel CLI
```bash
npm i -g vercel
```

### Login and Deploy
```bash
vercel login
vercel
```

Follow the prompts and add environment variables when asked.

---

## 📝 Important Notes

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **API Keys Security** - Always add keys in Vercel dashboard, never hardcode
3. **Automatic Deployments** - After initial setup, every push to `main` triggers auto-deploy
4. **Preview Deployments** - Every PR gets its own preview URL

---

## 🧪 Test Deployment

After deployment, your app will be live at:
```
https://your-project-name.vercel.app
```

Test the pipeline with a prompt like:
"Build a CRM for a real estate agency. Agents manage leads, properties, and deals. Admin sees analytics."

---

## 🛠️ Troubleshooting

### Build fails?
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Run `npm run build` locally first

### API errors?
- Verify environment variables are set in Vercel
- Check API key validity
- Review runtime logs in Vercel dashboard

### Need to update environment variables?
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Update the values
3. Redeploy: Deployments → [Latest] → Redeploy

---

## 🎯 Production Checklist

- [ ] Git installed and repository initialized
- [ ] Code pushed to GitHub
- [ ] Vercel account created
- [ ] Project imported to Vercel
- [ ] All environment variables added
- [ ] Deployment successful
- [ ] Test the live URL
- [ ] Set up custom domain (optional)

---

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [GitHub Documentation](https://docs.github.com)

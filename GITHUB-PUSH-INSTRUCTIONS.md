# 🚀 Push to GitHub Instructions

Your repository: **https://github.com/ayusho-o/The-Ai-signal.git**

---

## ⚠️ Git Not Detected

Git is not currently installed on your system. You need to install it first.

---

## 📥 Step 1: Install Git

### Option A: Git for Windows (Command Line)
1. Download: https://git-scm.com/download/win
2. Run the installer
3. Use default settings (click Next through installation)
4. **Restart your terminal/PowerShell after installation**

### Option B: GitHub Desktop (GUI - Easiest!)
1. Download: https://desktop.github.com/
2. Install and sign in with your GitHub account
3. See "Using GitHub Desktop" section below

---

## 🔧 Step 2: Push Your Code

### Using Command Line (After Installing Git)

**Just run this file:**
```cmd
push-to-github.bat
```

**Or manually run these commands:**
```bash
git init
git add .
git commit -m "Initial commit - OneAtlas AI Pipeline"
git remote add origin https://github.com/ayusho-o/The-Ai-signal.git
git branch -M main
git push -u origin main
```

### Using GitHub Desktop

1. Open GitHub Desktop
2. File → Add Local Repository
3. Choose folder: `c:\Users\aradh\intern`
4. Click "Create a repository" if prompted
5. Click "Publish repository"
6. **Uncheck** "Keep this code private" (or keep checked if you want private)
7. Repository name: `The-Ai-signal`
8. Click "Publish Repository"

---

## 🌐 Step 3: Deploy to Vercel

Once code is on GitHub:

1. **Go to Vercel:** https://vercel.com/new
2. **Sign in** with GitHub
3. **Import Repository:**
   - Select: `ayusho-o/The-Ai-signal`
   - Click "Import"
4. **Configure Project:**
   - Framework Preset: Next.js (auto-detected)
   - Root Directory: `./` (default)
   - Build Command: `npm run build` (auto-filled)
   - Output Directory: `.next` (auto-filled)
5. **Add Environment Variables:**
   Click "Environment Variables" and add:
   ```
   OPENAI_API_KEY=your_openai_key_here
   ANTHROPIC_API_KEY=your_anthropic_key_here
   GROQ_API_KEY=your_groq_key_here
   GEMINI_API_KEY=your_gemini_key_here
   GOOGLE_AI_API_KEY=your_google_ai_key_here
   ```
   
   **Get your actual keys from the `.env.local` file on your computer**
6. **Click "Deploy"**
7. **Wait 2-3 minutes** for deployment
8. **Your app will be live!** 🎉

---

## 📋 Quick Checklist

- [ ] Install Git (or GitHub Desktop)
- [ ] Run `push-to-github.bat` (or use GitHub Desktop)
- [ ] Verify code is on GitHub: https://github.com/ayusho-o/The-Ai-signal
- [ ] Go to Vercel: https://vercel.com/new
- [ ] Import repository
- [ ] Add all 5 environment variables
- [ ] Click Deploy
- [ ] Test your live URL!

---

## 🆘 Troubleshooting

### "Git not found" error?
- Install Git from https://git-scm.com/download/win
- **Restart your terminal** after installation
- Try running `push-to-github.bat` again

### "Permission denied" when pushing?
You may need to authenticate with GitHub:
```bash
# Use GitHub CLI (easier)
# Install from: https://cli.github.com/
gh auth login

# Or use Git credential manager
git config --global credential.helper wincred
```

### Already have files in the GitHub repo?
Use force push (careful - this overwrites):
```bash
git push -u origin main --force
```

### GitHub Desktop not seeing the folder?
Make sure you're selecting the correct folder: `c:\Users\aradh\intern`

---

## 🔐 Security Note

**IMPORTANT:** Your `.env.local` file is already in `.gitignore` and will NOT be pushed to GitHub. This is correct! 

Your API keys are safe locally and you'll add them separately in Vercel's dashboard.

---

## 📞 Need Help?

1. Check if Git is installed: Open terminal and type `git --version`
2. If not installed, use GitHub Desktop (easiest option)
3. Or install Git from: https://git-scm.com/download/win

---

**Once Git is installed, just run: `push-to-github.bat`** ✨

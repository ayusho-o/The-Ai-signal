================================================================================
  DEPLOY YOUR PROJECT - SIMPLE 3 STEPS
================================================================================

Your GitHub Repo: https://github.com/ayusho-o/The-Ai-signal.git

================================================================================
STEP 1: INSTALL GIT (One Time Only)
================================================================================

Option A - Git for Windows (Command Line):
  → Download: https://git-scm.com/download/win
  → Install with default settings
  → Restart your terminal

Option B - GitHub Desktop (Easier, Visual):
  → Download: https://desktop.github.com/
  → Install and sign in
  → Skip to STEP 2B below

================================================================================
STEP 2A: PUSH CODE (Using Command Line)
================================================================================

After installing Git, simply double-click this file:
  
  📁 push-to-github.bat

Or open terminal here and run:

  git init
  git add .
  git commit -m "Initial commit - OneAtlas AI Pipeline"
  git remote add origin https://github.com/ayusho-o/The-Ai-signal.git
  git branch -M main
  git push -u origin main

================================================================================
STEP 2B: PUSH CODE (Using GitHub Desktop)
================================================================================

1. Open GitHub Desktop
2. File → Add Local Repository
3. Select this folder: c:\Users\aradh\intern
4. Click "Publish repository"
5. Name: The-Ai-signal
6. Click "Publish Repository"

================================================================================
STEP 3: DEPLOY TO VERCEL
================================================================================

1. Go to: https://vercel.com/new
2. Sign in with GitHub
3. Import: ayusho-o/The-Ai-signal
4. Add Environment Variables (copy from below)
5. Click Deploy

ENVIRONMENT VARIABLES TO ADD IN VERCEL:
--------------------------------------------------------------------------------
Copy these from your .env.local file:

OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
GROQ_API_KEY=your_groq_key_here
GEMINI_API_KEY=your_gemini_key_here
GOOGLE_AI_API_KEY=your_google_ai_key_here

================================================================================
DONE! YOUR APP WILL BE LIVE IN 2-3 MINUTES
================================================================================

You'll get a URL like: https://the-ai-signal.vercel.app

Test it with this prompt:
"Build a CRM for a real estate agency. Agents manage leads, properties, 
and deals. Admin sees analytics."

================================================================================
NEED HELP?
================================================================================

See detailed instructions: GITHUB-PUSH-INSTRUCTIONS.md

================================================================================

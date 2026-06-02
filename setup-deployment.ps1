# OneAtlas Pipeline - Deployment Setup Script
# This script helps you deploy to GitHub and Vercel

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "OneAtlas Pipeline Deployment Setup" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check if Git is installed
Write-Host "Checking Git installation..." -ForegroundColor Yellow
try {
    $gitVersion = git --version
    Write-Host "✓ Git is installed: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Git is not installed!" -ForegroundColor Red
    Write-Host "Please install Git from: https://git-scm.com/download/win" -ForegroundColor Yellow
    Write-Host "After installing, restart PowerShell and run this script again." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Step 1: Initialize Git Repository" -ForegroundColor Cyan
Write-Host "-----------------------------------" -ForegroundColor Cyan

# Check if already a git repo
if (Test-Path ".git") {
    Write-Host "✓ Git repository already initialized" -ForegroundColor Green
} else {
    git init
    Write-Host "✓ Git repository initialized" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 2: Add and Commit Files" -ForegroundColor Cyan
Write-Host "-----------------------------------" -ForegroundColor Cyan

git add .
git commit -m "Initial commit - OneAtlas Pipeline with all API providers"
Write-Host "✓ Files committed to Git" -ForegroundColor Green

Write-Host ""
Write-Host "Step 3: GitHub Setup" -ForegroundColor Cyan
Write-Host "-----------------------------------" -ForegroundColor Cyan
Write-Host ""
Write-Host "Please complete these steps manually:" -ForegroundColor Yellow
Write-Host "1. Go to: https://github.com/new" -ForegroundColor White
Write-Host "2. Create a new repository (e.g., 'oneatlas-pipeline')" -ForegroundColor White
Write-Host "3. Do NOT initialize with README, .gitignore, or license" -ForegroundColor White
Write-Host ""

$repoUrl = Read-Host "Enter your GitHub repository URL (e.g., https://github.com/username/oneatlas-pipeline.git)"

if ($repoUrl) {
    git remote add origin $repoUrl
    git branch -M main
    git push -u origin main
    Write-Host "✓ Code pushed to GitHub!" -ForegroundColor Green
} else {
    Write-Host "⚠ Skipped GitHub push. You can do this manually later." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 4: Vercel Deployment" -ForegroundColor Cyan
Write-Host "-----------------------------------" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps to deploy on Vercel:" -ForegroundColor Yellow
Write-Host "1. Go to: https://vercel.com/new" -ForegroundColor White
Write-Host "2. Click 'Import Git Repository'" -ForegroundColor White
Write-Host "3. Select your GitHub repository" -ForegroundColor White
Write-Host "4. Add these environment variables:" -ForegroundColor White
Write-Host ""
Write-Host "   Copy values from your .env.local file:" -ForegroundColor Gray
Write-Host "   OPENAI_API_KEY=your_key_here" -ForegroundColor Gray
Write-Host "   ANTHROPIC_API_KEY=your_key_here" -ForegroundColor Gray
Write-Host "   GROQ_API_KEY=your_key_here" -ForegroundColor Gray
Write-Host "   GEMINI_API_KEY=your_key_here" -ForegroundColor Gray
Write-Host "   GOOGLE_AI_API_KEY=your_key_here" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Click 'Deploy'" -ForegroundColor White
Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "✓ Setup Complete!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your app is running locally at: http://localhost:3000" -ForegroundColor Green
Write-Host "For more details, see: DEPLOYMENT.md" -ForegroundColor Cyan

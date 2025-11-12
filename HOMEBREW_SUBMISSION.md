# Homebrew Cask Submission Guide for Todo App

Your app is ready for Homebrew distribution! Here's what's been prepared:

## ✅ Prerequisites Completed

- ✅ App is open source (public GitHub repo)
- ✅ DMG files built and hosted on GitHub Releases
- ✅ v1.0.10 release with both x64 and aarch64 DMGs
- ✅ Cask file created with SHA256 checksums
- ✅ Multi-architecture support (Intel & Apple Silicon)

## 📦 Release Details

**Version:** 1.0.10
**Release URL:** https://github.com/lilfourn/Todo-App/releases/tag/v1.0.10

**Assets:**
- `Todo.App_1.0.10_x64.dmg` (SHA256: 6df01c38a85f83ccfc39fdd9174d97fe739ae328902d435ffc1335a109ca4027)
- `Todo.App_1.0.10_aarch64.dmg` (SHA256: 31439ca04faba45bc1a4891dc1e75908e238fcfd20eb1ae8034b1b2ad9f9795d)

## 📄 Cask File

The cask file has been created at `todo-app.rb` with the following content:

```ruby
cask "todo-app" do
  version "1.0.10"

  on_intel do
    sha256 "6df01c38a85f83ccfc39fdd9174d97fe739ae328902d435ffc1335a109ca4027"
    url "https://github.com/lilfourn/Todo-App/releases/download/v#{version}/Todo.App_#{version}_x64.dmg"
  end

  on_arm do
    sha256 "31439ca04faba45bc1a4891dc1e75908e238fcfd20eb1ae8034b1b2ad9f9795d"
    url "https://github.com/lilfourn/Todo-App/releases/download/v#{version}/Todo.App_#{version}_aarch64.dmg"
  end

  name "Todo App"
  desc "Minimalist desktop todo app"
  homepage "https://github.com/lilfourn/Todo-App"

  livecheck do
    url :url
    strategy :github_latest
  end

  app "Todo App.app"

  zap trash: [
    "~/Library/Application Support/com.codebyfourn.todoapp",
    "~/Library/Caches/com.codebyfourn.todoapp",
    "~/Library/Preferences/com.codebyfourn.todoapp.plist",
  ]
end
```

## 🚀 Submission Steps

### Option 1: Submit to Official Homebrew (Recommended)

1. **Fork homebrew-cask:**
   ```bash
   # Visit https://github.com/Homebrew/homebrew-cask and click Fork
   ```

2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/homebrew-cask.git
   cd homebrew-cask
   ```

3. **Create branch:**
   ```bash
   git checkout -b add-todo-app
   ```

4. **Add cask file:**
   ```bash
   mkdir -p Casks/t
   cp /path/to/todo-app.rb Casks/t/todo-app.rb
   ```

5. **Commit and push:**
   ```bash
   git add Casks/t/todo-app.rb
   git commit -m "Add todo-app v1.0.10"
   git push origin add-todo-app
   ```

6. **Create PR:**
   - Go to https://github.com/Homebrew/homebrew-cask
   - Click "New Pull Request"
   - Select your branch
   - Fill in PR template
   - Submit!

### Option 2: Create Personal Tap (Faster, No Approval)

1. **Create tap repo:**
   ```bash
   # Create new repo: homebrew-todoapp
   # at https://github.com/YOUR_USERNAME/homebrew-todoapp
   ```

2. **Set up tap:**
   ```bash
   mkdir -p homebrew-todoapp/Casks
   cp todo-app.rb homebrew-todoapp/Casks/
   cd homebrew-todoapp
   git add .
   git commit -m "Add todo-app cask"
   git push
   ```

3. **Users install via:**
   ```bash
   brew tap YOUR_USERNAME/todoapp
   brew install --cask todo-app
   ```

## 📝 Next Steps After Submission

### For Official Homebrew PR:
- Wait for maintainer review (usually 2-7 days)
- Address any feedback
- Once merged, users can: `brew install --cask todo-app`

### For Personal Tap:
- No approval needed
- Users add tap first, then install
- You control updates

## 🔄 Updating the Cask

When releasing new versions:

1. **Create new GitHub release** with new DMGs
2. **Calculate new SHA256s:**
   ```bash
   shasum -a 256 /path/to/new.dmg
   ```
3. **Update cask file:**
   - Change `version` line
   - Update `sha256` for both architectures
4. **Submit update PR:**
   ```bash
   # Title: "todo-app: 1.0.10 -> 1.1.0"
   ```

Or use automated tool:
```bash
brew bump-cask-pr --version 1.1.0 todo-app
```

## ⚠️ Important Notes

**Gatekeeper Warning:**
- Users will see "unidentified developer" warning
- They'll need to right-click → Open first time
- To avoid: sign app with Apple Developer account ($99/year)

**Advantages of Homebrew:**
- ✅ Trusted distribution channel
- ✅ Easy discovery via `brew search`
- ✅ Simple updates for users
- ✅ Free hosting (GitHub Releases)
- ✅ Automated version checking

**What Users Can Do:**
```bash
# Search
brew search todo

# Install
brew install --cask todo-app

# Upgrade
brew upgrade todo-app

# Uninstall
brew uninstall --cask todo-app

# Remove all data
brew uninstall --cask --zap todo-app
```

## 📚 Resources

- [Homebrew Cask Documentation](https://docs.brew.sh/Cask-Cookbook)
- [Adding Software to Homebrew](https://docs.brew.sh/Adding-Software-to-Homebrew)
- [Homebrew Cask Repository](https://github.com/Homebrew/homebrew-cask)

## ✨ Your App is Ready!

Everything is prepared for Homebrew distribution. Choose your submission path and follow the steps above. Good luck! 🎉

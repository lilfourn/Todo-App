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

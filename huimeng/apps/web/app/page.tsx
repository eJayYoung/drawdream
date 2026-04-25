import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">绘</span>
            </div>
            <span className="text-xl font-semibold">绘梦</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/login" className="text-sm hover:text-primary">
              登录
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90"
            >
              注册
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center justify-center py-20 bg-gradient-to-b from-indigo-950/50 to-background">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            绘梦 · AI短剧生成平台
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            输入剧本，AI自动生成分镜、角色图、视频片段，
            <br />
            轻松创作你的专属短剧
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/register"
              className="px-8 py-3 bg-primary text-primary-foreground rounded-full text-lg font-medium hover:opacity-90 transition-opacity"
            >
              开始创作
            </Link>
            <Link
              href="/login"
              className="px-8 py-3 border border-primary text-primary rounded-full text-lg font-medium hover:bg-primary/5 transition-colors"
            >
              登录已有账号
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">创作流程</h2>
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6">
            {[
              { step: 1, title: '创作剧本', desc: 'AI辅助剧本创作' },
              { step: 2, title: '智能分集', desc: '自动拆分剧集' },
              { step: 3, title: '角色与配音', desc: '生成角色与音色' },
              { step: 4, title: '智能分镜', desc: 'AI生成分镜脚本' },
              { step: 5, title: '分镜图', desc: '生成高清分镜图' },
              { step: 6, title: '成片', desc: '一键合成成片' },
            ].map((item) => (
              <div
                key={item.step}
                className="p-6 rounded-xl border bg-card text-card-foreground hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © 2026 绘梦. All rights reserved.
        </div>
      </footer>
    </main>
  );
}

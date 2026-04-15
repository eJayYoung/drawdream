export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <span className="text-2xl font-bold">绘</span>
            </div>
            <span className="text-2xl font-semibold">绘梦</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">AI短剧生成平台</h1>
          <p className="text-lg text-white/80">
            用AI技术，让创意触手可及
          </p>
        </div>
        <div className="text-sm text-white/60">
          © 2026 绘梦. All rights reserved.
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-8">
        {children}
      </div>
    </div>
  );
}

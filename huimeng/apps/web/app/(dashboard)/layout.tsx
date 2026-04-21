'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  FolderOpen,
  Image,
  PlaySquare,
  LogOut,
} from 'lucide-react';

const navItems = [
  { href: '/home', label: '首页', icon: Home },
  { href: '/projects', label: '项目管理', icon: FolderOpen },
  { href: '/materials', label: '素材管理', icon: Image },
  { href: '/published', label: '发布作品', icon: PlaySquare },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation */}
      <header className="h-14 bg-card border-b flex items-center justify-between px-4 flex-shrink-0">
        {/* Logo */}
        <Link href="/home" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">绘</span>
          </div>
          <span className="text-lg font-semibold">绘梦</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm
                  ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  }
                `}
              >
                <item.icon size={16} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent text-sm text-muted-foreground hover:text-destructive"
        >
          <LogOut size={16} />
          <span>退出</span>
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}

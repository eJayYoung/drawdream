import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '绘梦 - AI短剧生成平台',
  description: '使用AI技术，让创意触手可及',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body className={`${inter.className} dark`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

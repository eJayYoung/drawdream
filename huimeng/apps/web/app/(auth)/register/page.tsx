'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function RegisterPage() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handleSendCode = () => {
    setCodeSent(true);
  };

  const handleRegister = () => {
    if (!agreed) {
      alert('请同意用户协议');
      return;
    }
    console.log('register', { phone, code });
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">注册绘梦</h2>
        <p className="text-muted-foreground">
          已有账号？{' '}
          <Link href="/login" className="text-primary hover:underline">
            立即登录
          </Link>
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">手机号</label>
          <div className="flex gap-2">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="请输入手机号"
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={handleSendCode}
              disabled={codeSent}
              className="px-4 py-2 border rounded-lg hover:bg-accent disabled:opacity-50"
            >
              {codeSent ? '已发送' : '获取验证码'}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">验证码</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="请输入验证码"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="agreement"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1"
          />
          <label htmlFor="agreement" className="text-sm text-muted-foreground">
            我已阅读并同意{' '}
            <a href="/terms" className="text-primary hover:underline">
              《用户协议》
            </a>{' '}
            和{' '}
            <a href="/privacy" className="text-primary hover:underline">
              《隐私政策》
            </a>
          </label>
        </div>

        <button
          onClick={handleRegister}
          className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90"
        >
          注册
        </button>
      </div>
    </div>
  );
}

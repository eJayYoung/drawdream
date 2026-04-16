'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function LoginPage() {
  const router = useRouter();
  const [loginType, setLoginType] = useState<'phone' | 'wechat'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendCode = async () => {
    if (countdown > 0) return;

    if (!phone || phone.length !== 11) {
      setError('请输入正确的手机号');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/phone/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json() as { success: boolean; code?: string };
      if (data.success) {
        setCodeSent(true);
        setCountdown(60);
        // 开发模式下显示验证码
        if (data.code) {
          console.log(`[DEV] 验证码: ${data.code}`);
        }
      } else {
        setError('发送失败');
      }
    } catch (e) {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  // 倒计时 effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleLogin = async () => {
    if (!phone || !code) {
      setError('请输入手机号和验证码');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/auth/phone/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json() as { accessToken?: string; user?: any; message?: string };
      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        router.push('/home');
      } else {
        setError(data.message || '登录失败');
      }
    } catch (e) {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const handleWechatLogin = async () => {
    // Mock WeChat login for dev - call real API to get JWT token
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/wechat/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'mock_wechat_dev' }),
      });

      if (!res.ok) {
        throw new Error('微信登录失败');
      }

      const data = await res.json() as { accessToken: string; user: any };
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/home');
    } catch (err: any) {
      setError(err.message || '微信登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">登录绘梦</h2>
        <p className="text-muted-foreground">
          还没有账号？{' '}
          <Link href="/register" className="text-primary hover:underline">
            立即注册
          </Link>
        </p>
      </div>

      {/* Login type tabs */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setLoginType('phone')}
          className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
            loginType === 'phone'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground'
          }`}
        >
          手机号登录
        </button>
        <button
          onClick={() => setLoginType('wechat')}
          className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
            loginType === 'wechat'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground'
          }`}
        >
          微信登录
        </button>
      </div>

      {loginType === 'phone' ? (
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
                disabled={countdown > 0 || loading}
                className="px-4 py-2 border rounded-lg hover:bg-accent disabled:opacity-50 min-w-[100px]"
              >
                {countdown > 0 ? `${countdown}秒` : '获取验证码'}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 mt-2">{error}</p>
          )}

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

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 disabled:opacity-50"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border rounded-xl p-8 text-center">
            <div className="w-48 h-48 mx-auto bg-muted rounded-lg mb-4 flex items-center justify-center">
              <span className="text-muted-foreground">微信扫码区域</span>
              {/* TODO: Insert WeChat QR code */}
            </div>
            <p className="text-sm text-muted-foreground">
              请使用微信扫描二维码登录
            </p>
          </div>
          <button
            onClick={handleWechatLogin}
            className="w-full py-3 border rounded-lg font-medium hover:bg-accent"
          >
            模拟微信登录（开发用）
          </button>
        </div>
      )}
    </div>
  );
}

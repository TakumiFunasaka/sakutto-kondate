'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChefHat, Users, Clock, Utensils } from 'lucide-react';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    // セッションストレージで認証状態を確認
    const authStatus = sessionStorage.getItem('authenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // 環境変数からパスワードを取得（本番では環境変数を使用）
    const correctPassword = process.env.NEXT_PUBLIC_APP_PASSWORD || 'recipe2024';
    
    if (password === correctPassword) {
      setIsAuthenticated(true);
      sessionStorage.setItem('authenticated', 'true');
      setError('');
    } else {
      setError('パスワードが正しくありません');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('authenticated');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
            <div className="text-center mb-8">
              <img 
                src="/images/logoicon.svg" 
                alt="サクッと献立ロゴ" 
                className="w-16 h-16 mx-auto mb-4"
              />
              <h1 className="text-3xl font-bold text-gray-800 mb-2">サクッと献立</h1>
              <p className="text-gray-600">AIがあなたの献立をサクッと提案します</p>
            </div>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                パスワード
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-700"
                placeholder=""
                required
              />
            </div>
            
            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}
            
            <button
              type="submit"
              className="w-full bg-amber-600 text-white py-3 px-4 rounded-lg hover:bg-amber-700 transition-colors font-medium"
            >
              ログイン
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 md:py-4">
            <div className="flex items-center">
              <img 
                src="/images/logotype.svg" 
                alt="サクッと献立" 
                className="h-12 md:h-16"
              />
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-800 transition-colors text-sm md:text-base"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Hero Section */}
          <div className="mb-8">
            {/* 文字入りロゴ */}
            <div className="mb-6">
              <img 
                src="/images/logotype.svg" 
                alt="サクッと献立" 
                className="h-32 md:h-48 mx-auto"
              />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
              今日の献立を
              <br className="md:hidden" />
              <span className="text-amber-600">一瞬で決めよう</span>
            </h2>
            <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              家にある食材を教えてください。<br className="md:hidden" />
              AIが美味しい献立を提案します。
            </p>
          </div>

          {/* Hero Image */}
          <div className="mb-8">
            <div className="relative mx-auto w-full max-w-md h-64 rounded-2xl shadow-lg overflow-hidden">
              <img 
                src="/images/hero-image.png" 
                alt="美味しい料理" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Quick Features */}
          <div className="flex flex-wrap justify-center gap-4 mb-8 text-sm text-gray-600">
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              1時間以内
            </div>
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              家族構成対応
            </div>
            <div className="flex items-center">
              <Utensils className="w-4 h-4 mr-1" />
              詳細レシピ
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={() => router.push('/recipe')}
            className="bg-amber-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-amber-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            サクッと献立を提案してもらう
          </button>
        </div>
      </main>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, X, ChefHat, Clock, Users, Utensils } from 'lucide-react';

interface Recipe {
  title: string;
  menuItems: string[];
  ingredients: string[];
  instructions: string[];
  tips: string[];
  servings: string;
  totalTime: string;
}

interface Ingredient {
  name: string;
  quantity: string;
}

const GENRES = [
  { id: 'any', name: '指定なし', description: 'どんなジャンルでもOK' },
  { id: 'japanese', name: '和食', description: 'ご飯、味噌汁、煮物など' },
  { id: 'western', name: '洋食', description: 'パスタ、サラダ、スープなど' },
  { id: 'chinese', name: '中華', description: '炒め物、餃子、麻婆豆腐など' },
  { id: 'cafe', name: 'おしゃれカフェ風', description: 'サンドイッチ、スムージー、パンケーキなど' },
  { id: 'diet', name: 'ダイエット', description: '低カロリー、ヘルシーな料理' },
  { id: 'comfort', name: '家庭料理', description: '定番の家庭的な料理' },
  { id: 'quick', name: '時短料理', description: '15分以内で作れる簡単料理' },
  { id: 'kids', name: '子供向け', description: '子供が喜ぶ見た目と味' },
  { id: 'healthy', name: '健康志向', description: '栄養バランス重視の料理' }
];

export default function RecipePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ name: '', quantity: '' }]);
  const [familyMembers, setFamilyMembers] = useState<string>('');
  const [familyAges, setFamilyAges] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string>('any');
  const [additionalRequest, setAdditionalRequest] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    // 認証チェック
    const authStatus = sessionStorage.getItem('authenticated');
    if (authStatus !== 'true') {
      router.push('/');
      return;
    }
    setIsAuthenticated(true);

    // 保存された設定を読み込み（家族構成のみ）
    const savedFamilyMembers = localStorage.getItem('familyMembers');
    const savedFamilyAges = localStorage.getItem('familyAges');
    if (savedFamilyMembers) setFamilyMembers(savedFamilyMembers);
    if (savedFamilyAges) setFamilyAges(savedFamilyAges);
  }, [router]);

  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', quantity: '' }]);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const updateIngredient = (index: number, field: 'name' | 'quantity', value: string) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setIngredients(newIngredients);
  };

  const saveUserPreferences = () => {
    localStorage.setItem('familyMembers', familyMembers);
    localStorage.setItem('familyAges', familyAges);
    // ジャンルと追加要望は記憶しない（毎回変わるため）
  };

  const generateRecipe = async () => {
    const validIngredients = ingredients.filter(ing => ing.name.trim() !== '');
    // 食材の制限をなくして、完全にフリーに考えさせる

    // ユーザー設定を保存
    saveUserPreferences();

    setIsLoading(true);
    setError('');
    setRecipe(null);

    // 食材を文字列形式に変換（分量がある場合は含める）
    // 食材が入力されていない場合は空配列を送信
    const ingredientStrings = validIngredients.map(ing => 
      ing.quantity.trim() ? `${ing.name} ${ing.quantity}` : ing.name
    );

    try {
      const response = await fetch('/api/generate-recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ingredients: ingredientStrings,
          familyMembers,
          familyAges,
          genre: selectedGenre,
          additionalRequest,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: レシピの生成に失敗しました`);
      }

      const data = await response.json();
      setRecipe(data.recipe);
      
      // レシピ生成後に画面上部までスクロール
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'レシピの生成中にエラーが発生しました。もう一度お試しください。';
      setError(errorMessage);
      console.error('Recipe generation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return <div>認証中...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <button
              onClick={() => router.push('/')}
              className="flex items-center text-gray-600 hover:text-gray-800 transition-colors mr-4"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              戻る
            </button>
            <img 
              src="/images/logotype.svg" 
              alt="サクッと献立" 
              className="h-12 md:h-16"
            />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!recipe ? (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">
              サクッと献立を提案してもらう
            </h2>

            {/* 食材入力 */}
            <div className="mb-8">
              <label className="block text-lg font-semibold text-gray-700 mb-4">
                家にある食材を教えてください
              </label>
              <p className="text-sm text-gray-600 mb-4">
                食材名と分量は任意です。何も入力しなくても、AIが自由に献立を考えます。分量を入力するとより具体的なレシピを提案します。
              </p>
              {ingredients.map((ingredient, index) => (
                <div key={index} className="mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        食材名
                      </label>
                      <input
                        type="text"
                        value={ingredient.name}
                        onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                        placeholder=""
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-700"
                      />
                    </div>
                    <div className="w-32">
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        分量
                      </label>
                      <input
                        type="text"
                        value={ingredient.quantity}
                        onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                        placeholder=""
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-700"
                      />
                    </div>
                    {ingredients.length > 1 && (
                      <div className="flex items-end">
                        <button
                          onClick={() => removeIngredient(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <button
                onClick={addIngredient}
                className="flex items-center text-orange-500 hover:text-orange-600 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                食材を追加
              </button>
            </div>

            {/* ジャンル選択 */}
            <div className="mb-8">
              <label className="block text-lg font-semibold text-gray-700 mb-4">
                料理のジャンル
              </label>
              <p className="text-sm text-gray-600 mb-4">
                希望する料理のジャンルを選択してください（任意）
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {GENRES.map((genre) => (
                  <button
                    key={genre.id}
                    onClick={() => setSelectedGenre(genre.id)}
                    className={`p-3 rounded-lg border-2 text-left transition-colors ${
                      selectedGenre === genre.id
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="font-medium text-sm">{genre.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{genre.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 追加要望 */}
            <div className="mb-8">
              <label className="block text-lg font-semibold text-gray-700 mb-4">
                追加要望
              </label>
              <p className="text-sm text-gray-600 mb-4">
                特別な要望があれば自由に記入してください。基本条件より優先されます。
              </p>
              <textarea
                value={additionalRequest}
                onChange={(e) => setAdditionalRequest(e.target.value)}
                placeholder=""
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-700 h-24 resize-none"
                rows={4}
              />
            </div>

            {/* 家族構成 */}
            <div className="mb-8">
              <label className="block text-lg font-semibold text-gray-700 mb-4">
                家族構成
              </label>
              <p className="text-sm text-gray-600 mb-4">
                一度入力すると次回から自動で表示されます。
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    人数
                  </label>
                  <input
                    type="text"
                    value={familyMembers}
                    onChange={(e) => setFamilyMembers(e.target.value)}
                    placeholder=""
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    年齢構成
                  </label>
                  <input
                    type="text"
                    value={familyAges}
                    onChange={(e) => setFamilyAges(e.target.value)}
                    placeholder=""
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-700"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            <div className="text-center">
              <button
                onClick={generateRecipe}
                disabled={isLoading}
                className="bg-orange-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-orange-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '献立を考え中...' : 'サクッと献立を提案してもらう'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-4">{recipe.title}</h2>
              <div className="flex justify-center space-x-6 text-gray-600">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  準備から完成まで: {recipe.totalTime}
                </div>
                <div className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  {recipe.servings}
                </div>
              </div>
            </div>

            {/* メニュー項目 */}
            {recipe.menuItems && recipe.menuItems.length > 0 && (
              <div className="mb-8">
                <h3 className="text-2xl font-semibold text-gray-800 mb-4">献立内容</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  {recipe.menuItems.map((item, index) => (
                    <div key={index} className="flex items-center p-3 bg-orange-50 rounded-lg">
                      <span className="w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                        {index + 1}
                      </span>
                      <span className="text-gray-700 font-medium">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 材料 */}
            <div className="mb-8">
              <h3 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
                <Utensils className="w-6 h-6 mr-2" />
                材料
              </h3>
              <ul className="space-y-2">
                {recipe.ingredients.map((ingredient, index) => (
                  <li key={index} className="flex items-start">
                    <span className="w-2 h-2 bg-orange-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span className="text-gray-700">{ingredient}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 作り方 */}
            <div className="mb-8">
              <h3 className="text-2xl font-semibold text-gray-800 mb-4">作り方</h3>
              <ol className="space-y-4">
                {recipe.instructions.map((instruction, index) => (
                  <li key={index} className="flex items-start">
                    <span className="bg-orange-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-semibold mr-4 flex-shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-gray-700 leading-relaxed">{instruction}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* コツ */}
            {recipe.tips.length > 0 && (
              <div className="mb-8">
                <h3 className="text-2xl font-semibold text-gray-800 mb-4">コツ・ポイント</h3>
                <ul className="space-y-2">
                  {recipe.tips.map((tip, index) => (
                    <li key={index} className="flex items-start">
                      <span className="w-2 h-2 bg-orange-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      <span className="text-gray-700">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="text-center space-y-4">
              <button
                onClick={() => {
                  setRecipe(null);
                  setIngredients([{ name: '', quantity: '' }]);
                  setAdditionalRequest('');
                  // 新しい献立提案画面に戻る際も画面上部までスクロール
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="bg-orange-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-orange-700 transition-colors shadow-lg"
              >
                新しい献立をサクッと提案してもらう
              </button>
              <button
                onClick={() => router.push('/')}
                className="bg-gray-500 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-gray-600 transition-colors shadow-lg"
              >
                ホームに戻る
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

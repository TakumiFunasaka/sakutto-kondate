import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// 工程最適化の固定ロジック（LLMから委譲）
interface RecipeStep {
  id: number;
  title: string;
  description: string;
  duration: number;
  dependencies: number[];
  canParallel: boolean;
  category: 'prep' | 'cook' | 'serve' | 'wait';
  startTime: number;
  dishLabel?: string;
}

function optimizeSteps(steps: RecipeStep[]) {
  if (!steps || steps.length === 0) return steps;
  
  // 依存関係を考慮してstartTimeを計算（再帰的アプローチ）
  const optimizedSteps = [...steps];
  const calculated = new Set<number>();
  
  function calculateStartTime(stepId: number): number {
    const step = optimizedSteps.find(s => s.id === stepId);
    if (!step) return 0;
    
    // 既に計算済みの場合はその値を返す
    if (calculated.has(stepId)) {
      return step.startTime || 0;
    }
    
    calculated.add(stepId);
    let startTime = 0;
    
    // 依存関係がある場合、依存する工程の終了時間を計算
    if (step.dependencies && step.dependencies.length > 0) {
      const dependencyEndTimes = step.dependencies.map((depId: number) => {
        const depStartTime = calculateStartTime(depId);
        const depStep = optimizedSteps.find(s => s.id === depId);
        const depDuration = depStep ? depStep.duration : 0;
        return depStartTime + depDuration;
      });
      startTime = Math.max(...dependencyEndTimes);
    }
    
    // startTimeを更新
    step.startTime = startTime;
    return startTime;
  }
  
  // 全ての工程のstartTimeを計算
  optimizedSteps.forEach(step => {
    calculateStartTime(step.id);
  });
  
  return optimizedSteps;
}

// 最適化された時間を計算
function calculateOptimizedTime(steps: RecipeStep[]) {
  if (!steps || steps.length === 0) return 30;
  
  // 各工程の終了時間を計算
  const endTimes = steps.map(step => (step.startTime || 0) + step.duration);
  
  // 最大の終了時間が最適化された時間
  return Math.max(...endTimes);
}


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


export async function POST(request: NextRequest) {
  try {
    console.log('API called - checking environment variables...');
    console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
    
    const { ingredients, familyMembers, familyAges, genre, additionalRequest } = await request.json();
    console.log('Received data:', { ingredients, familyMembers, familyAges, genre, additionalRequest });

    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not set');
      return NextResponse.json(
        { error: 'OpenAI API キーが設定されていません' },
        { status: 500 }
      );
    }

    // ジャンルに応じた説明を生成
    const getGenreDescription = (genreId: string) => {
      const genreMap: { [key: string]: string } = {
        'any': '',
        'japanese': '和食（ご飯、味噌汁、煮物、焼き魚など）',
        'western': '洋食（パスタ、サラダ、スープ、オムレツなど）',
        'chinese': '中華（炒め物、餃子、麻婆豆腐、春巻きなど）',
        'cafe': 'おしゃれカフェ風（サンドイッチ、スムージー、パンケーキ、サラダボウルなど）',
        'diet': 'ダイエット向け（低カロリー、ヘルシー、野菜中心）',
        'comfort': '家庭料理（定番の家庭的な料理、懐かしい味）',
        'quick': '時短料理（15分以内で作れる簡単料理）',
        'kids': '子供向け（見た目が可愛く、子供が喜ぶ味）',
        'healthy': '健康志向（栄養バランス重視、体に良い食材使用）'
      };
      return genreMap[genreId] || '';
    };

    const genreDescription = getGenreDescription(genre || 'any');
    const genreCondition = genreDescription ? `- 料理ジャンル: ${genreDescription}` : '';

    // 追加要望がある場合は基本条件を上書き
    const hasAdditionalRequest = additionalRequest && additionalRequest.trim() !== '';
    
    // 多様性を確保するためのランダム要素を追加
    const diversityPrompts = [
      "季節感を意識した献立を提案してください。",
      "地域の特色を活かした献立を提案してください。",
      "家庭的な味わいの献立を提案してください。",
      "健康的で栄養バランスの良い献立を提案してください。",
      "時短でも美味しい献立を提案してください。",
      "見た目も美しい献立を提案してください。",
      "子供も喜ぶ献立を提案してください。",
      "大人向けの本格的な献立を提案してください。"
    ];
    
    const randomDiversityPrompt = diversityPrompts[Math.floor(Math.random() * diversityPrompts.length)];
    
    const prompt = `あなたは経験豊富な料理研究家です。${randomDiversityPrompt}


【基本条件】
- 使用食材: ${ingredients && ingredients.length > 0 ? ingredients.join(', ') : '特に指定なし（自由に考えてください）'}
- 家族構成: ${familyMembers || '未指定'}
- 年齢構成: ${familyAges || '未指定'}
${genreCondition}
- 調理時間: 1時間以内
- 手軽で作りやすい料理
- 栄養バランスを考慮
- 一食として成立する献立
- 創造的で新鮮な献立を提案してください
- 季節を考慮した献立を心がけてください

${hasAdditionalRequest ? `
【重要：追加要望（基本条件より優先）】
${additionalRequest}

上記の追加要望が基本条件と矛盾する場合は、追加要望を優先してください。
` : ''}

【品質要件】
- 材料は正確な分量を記載（例：「鶏もも肉 200g」「玉ねぎ 1/2個」）
- 手順は具体的で再現可能な内容
- 調理のポイントやコツを必ず含める
- 工程は実際の調理時間を正確に設定
- 並行作業は実用的で安全なもののみ

【出力形式】
以下のJSON形式で回答してください：

{
  "title": "献立名（例：鶏の香味焼きと具だくさんスープ）",
  "menuItems": ["メニュー1", "メニュー2"],
  "ingredients": ["鶏もも肉 200g", "玉ねぎ 1/2個", "にんじん 1/3本"],
  "instructions": ["具体的な手順1", "具体的な手順2", "具体的な手順3"],
  "tips": ["美味しく作るコツ1", "美味しく作るコツ2"],
  "servings": "人数分（例：4人分）",
  "totalTime": "準備から完成まで（例：35分）",
  "steps": [
    {
      "id": 1,
      "title": "具体的な工程名（例：鶏肉を一口大に切る）",
      "description": "詳細で具体的な手順説明",
      "duration": 5,
      "dependencies": [],
      "canParallel": true,
      "category": "prep",
      "startTime": 0,
      "dishLabel": "A"
    }
  ],
  "optimizedTime": 30
}

【工程分析の重要ポイント】
- 白米の炊飯は工程に含めない（一般的な白米を想定）
- 並行作業は「手を動かす作業が1つ」の原則で判定
- 例：煮込み中（手を動かさない）に野菜を切る（手を動かす）→ 並行可能
- 例：野菜を切る（手を動かす）と肉を下味付けする（手を動かす）→ 並行不可
- 待ち時間（煮込み、水にさらす、冷ますなど）を積極的に活用
- dependencies: この工程の前に完了すべき工程のid配列
- startTime: 0で設定してください（後で自動計算されます）
- dishLabel: この工程がどの料理に対応するか（A, B, C等）を指定してください

【注意事項】
- 必ずJSON形式で回答し、他のテキストは含めないでください
- 定番料理を避け、創造的な献立を提案してください
- 材料の分量は正確に記載してください
- 手順は初心者でも再現できるよう具体的に記載してください

重要：上記のJSON形式のみで回答してください。説明文やその他のテキストは一切含めないでください。`;

    console.log('Calling OpenAI API...');
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "あなたは経験豊富な料理研究家です。創造的で実用的な献立を提案し、具体的で再現可能なレシピを提供してください。定番料理を避け、新鮮で魅力的な献立を心がけてください。必ず指定されたJSON形式のみで回答し、他のテキストは一切含めないでください。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.8, // 多様性を重視しつつ品質も確保
      max_tokens: 2500, // トークン数を増やしてJSON生成を安定化
    });
    console.log('OpenAI API response received');

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('AIからの応答がありません');
    }

    // AIの生の応答をコンソールに出力
    console.log('=== AI Raw Response ===');
    console.log(response);
    console.log('=== End AI Response ===');

    // JSONをパース
    let recipe;
    try {
      recipe = JSON.parse(response);
      console.log('=== Parsed Recipe Data ===');
      console.log(JSON.stringify(recipe, null, 2));
      console.log('=== End Parsed Data ===');
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Response length:', response.length);
      console.error('Response (first 1000 chars):', response.substring(0, 1000));
      console.error('Response (last 1000 chars):', response.substring(Math.max(0, response.length - 1000)));
      
      // JSON部分を抽出して再試行
      try {
        const jsonStart = response.indexOf('{');
        const jsonEnd = response.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          const extractedJson = response.substring(jsonStart, jsonEnd + 1);
          console.log('Trying to parse extracted JSON...');
          recipe = JSON.parse(extractedJson);
          console.log('Successfully parsed extracted JSON');
        } else {
          throw new Error('No valid JSON found in response');
        }
      } catch (secondParseError) {
        console.error('Second parse attempt failed:', secondParseError);
        throw new Error('AIの応答を解析できませんでした');
      }
    }

    // 必要なフィールドが存在するかチェック（簡素化）
    const requiredFields = ['title', 'ingredients', 'instructions', 'servings', 'totalTime'];
    for (const field of requiredFields) {
      if (!recipe[field]) {
        throw new Error(`レシピに${field}が含まれていません`);
      }
    }
    
    // オプションフィールドのデフォルト値を設定
    if (!recipe.menuItems) recipe.menuItems = [];
    if (!recipe.tips) recipe.tips = [];
    if (!recipe.steps) recipe.steps = [];
    
    // 工程の最適化を固定ロジックで実行（LLMから委譲）
    if (recipe.steps && recipe.steps.length > 0) {
      recipe.steps = optimizeSteps(recipe.steps);
      recipe.optimizedTime = calculateOptimizedTime(recipe.steps);
    } else {
      recipe.optimizedTime = parseInt(recipe.totalTime) || 30;
    }

    return NextResponse.json({ recipe });

  } catch (error) {
    console.error('Recipe generation error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'レシピ生成中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

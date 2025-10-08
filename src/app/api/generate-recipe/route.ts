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

// 材料名を抽出する関数（簡易版）
function extractIngredients(description: string): string[] {
  const commonIngredients = [
    '鶏肉', '豚肉', '牛肉', '魚', '玉ねぎ', 'にんじん', 'じゃがいも', 'キャベツ', '白菜',
    'トマト', 'きゅうり', 'なす', 'ピーマン', '大根', 'かぼちゃ', 'ブロッコリー',
    '卵', '豆腐', '納豆', '味噌', '醤油', '砂糖', '塩', '胡椒', '油', 'バター',
    '米', 'パン', '麺', 'パスタ', 'うどん', 'そば', 'ラーメン'
  ];
  
  const foundIngredients: string[] = [];
  for (const ingredient of commonIngredients) {
    if (description.includes(ingredient)) {
      foundIngredients.push(ingredient);
    }
  }
  return foundIngredients;
}

// 並行作業可能かどうかを判定する関数
function canRunInParallel(step1: RecipeStep, step2: RecipeStep): boolean {
  // 両方とも並行作業可能でない場合は並行不可
  if (!step1.canParallel || !step2.canParallel) {
    return false;
  }
  
  // 異なる料理の場合は常に並行可能
  if (step1.dishLabel && step2.dishLabel && step1.dishLabel !== step2.dishLabel) {
    return true;
  }
  
  // 同じ料理の場合は材料の重複をチェック
  if (step1.dishLabel === step2.dishLabel) {
    const ingredients1 = extractIngredients(step1.description);
    const ingredients2 = extractIngredients(step2.description);
    
    // 材料が重複している場合は並行不可
    const hasOverlap = ingredients1.some(ing => ingredients2.includes(ing));
    if (hasOverlap) {
      return false;
    }
    
    // 調理器具の競合をチェック（簡易版）
    const cookingActions1 = step1.description.toLowerCase();
    const cookingActions2 = step2.description.toLowerCase();
    
    // 同じ調理器具を使う可能性がある場合は並行不可
    const cookingConflicts = [
      ['フライパン', '炒める', '焼く'],
      ['鍋', '煮る', '茹でる'],
      ['オーブン', '焼く', 'ロースト'],
      ['電子レンジ', '温める', '解凍']
    ];
    
    for (const conflict of cookingConflicts) {
      const hasConflict1 = conflict.some(action => cookingActions1.includes(action));
      const hasConflict2 = conflict.some(action => cookingActions2.includes(action));
      if (hasConflict1 && hasConflict2) {
        return false;
      }
    }
  }
  
  return true;
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
    
    // 並行作業の最適化：同じ時間帯に実行可能な工程を探す
    const parallelCandidates = optimizedSteps.filter(s => 
      s.id !== stepId && 
      s.startTime !== undefined && 
      canRunInParallel(step, s)
    );
    
    // 並行可能な工程がある場合、その開始時間を考慮
    if (parallelCandidates.length > 0) {
      const parallelStartTimes = parallelCandidates.map(s => s.startTime || 0);
      const maxParallelStart = Math.max(...parallelStartTimes);
      startTime = Math.max(startTime, maxParallelStart);
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

// 工程の重複を検出する関数
function detectStepOverlap(step1: RecipeStep, step2: RecipeStep): boolean {
  const step1Start = step1.startTime || 0;
  const step1End = step1Start + step1.duration;
  const step2Start = step2.startTime || 0;
  const step2End = step2Start + step2.duration;
  
  // 時間の重複をチェック
  return !(step1End <= step2Start || step2End <= step1Start);
}

// 並行処理の矛盾を検出する関数
function detectParallelConflicts(steps: RecipeStep[]): { step1: RecipeStep, step2: RecipeStep }[] {
  const conflicts: { step1: RecipeStep, step2: RecipeStep }[] = [];
  
  for (let i = 0; i < steps.length; i++) {
    for (let j = i + 1; j < steps.length; j++) {
      const step1 = steps[i];
      const step2 = steps[j];
      
      // 両方とも並行処理不可で、時間が重複している場合
      if (!step1.canParallel && !step2.canParallel && detectStepOverlap(step1, step2)) {
        conflicts.push({ step1, step2 });
      }
    }
  }
  
  return conflicts;
}

// 時間の空白を検出する関数
function detectTimeGaps(steps: RecipeStep[]): { gapStart: number, gapEnd: number }[] {
  if (!steps || steps.length === 0) return [];
  
  const gaps: { gapStart: number, gapEnd: number }[] = [];
  const sortedSteps = [...steps].sort((a, b) => (a.startTime || 0) - (b.startTime || 0));
  
  // 最初の工程より前の空白
  if (sortedSteps[0].startTime > 0) {
    gaps.push({ gapStart: 0, gapEnd: sortedSteps[0].startTime });
  }
  
  // 工程間の空白
  for (let i = 0; i < sortedSteps.length - 1; i++) {
    const currentStep = sortedSteps[i];
    const nextStep = sortedSteps[i + 1];
    const currentEnd = (currentStep.startTime || 0) + currentStep.duration;
    const nextStart = nextStep.startTime || 0;
    
    if (currentEnd < nextStart) {
      gaps.push({ gapStart: currentEnd, gapEnd: nextStart });
    }
  }
  
  return gaps;
}

// 工程の検証と修正を行う関数
function validateAndFixSteps(steps: RecipeStep[]): RecipeStep[] {
  if (!steps || steps.length === 0) return steps;
  
  console.log('=== Steps Validation Started ===');
  const fixedSteps = [...steps];
  let hasChanges = true;
  let iterationCount = 0;
  const maxIterations = 10; // 無限ループ防止
  
  while (hasChanges && iterationCount < maxIterations) {
    iterationCount++;
    hasChanges = false;
    
    console.log(`Validation iteration ${iterationCount}`);
    
    // 1. 並行処理の矛盾を検出・修正
    const conflicts = detectParallelConflicts(fixedSteps);
    if (conflicts.length > 0) {
      console.log(`Found ${conflicts.length} parallel conflicts`);
      
      // 矛盾がある工程を後ろにずらす
      for (const conflict of conflicts) {
        const { step1, step2 } = conflict;
        const laterStep = (step1.startTime || 0) > (step2.startTime || 0) ? step1 : step2;
        const earlierStep = laterStep === step1 ? step2 : step1;
        
        // 後の工程を前の工程の終了時間に設定
        const newStartTime = (earlierStep.startTime || 0) + earlierStep.duration;
        laterStep.startTime = newStartTime;
        
        console.log(`Moved step "${laterStep.title}" to time ${newStartTime}`);
        hasChanges = true;
      }
    }
    
    // 2. 時間の空白を検出・修正
    const gaps = detectTimeGaps(fixedSteps);
    if (gaps.length > 0) {
      console.log(`Found ${gaps.length} time gaps`);
      
      // 空白を詰めるために、空白より後の工程を前にシフト
      for (const gap of gaps) {
        const gapDuration = gap.gapEnd - gap.gapStart;
        
        // 空白より後の工程を前にシフト
        fixedSteps.forEach(step => {
          if ((step.startTime || 0) >= gap.gapEnd) {
            step.startTime = (step.startTime || 0) - gapDuration;
            hasChanges = true;
          }
        });
        
        console.log(`Compressed gap from ${gap.gapStart} to ${gap.gapEnd} (${gapDuration}min)`);
      }
    }
    
    // 3. 依存関係の再検証
    const sortedSteps = [...fixedSteps].sort((a, b) => (a.startTime || 0) - (b.startTime || 0));
    for (const step of sortedSteps) {
      if (step.dependencies && step.dependencies.length > 0) {
        const dependencyEndTimes = step.dependencies.map(depId => {
          const depStep = fixedSteps.find(s => s.id === depId);
          return depStep ? (depStep.startTime || 0) + depStep.duration : 0;
        });
        
        const requiredStartTime = Math.max(...dependencyEndTimes);
        if ((step.startTime || 0) < requiredStartTime) {
          step.startTime = requiredStartTime;
          hasChanges = true;
          console.log(`Adjusted step "${step.title}" start time to ${requiredStartTime} due to dependencies`);
        }
      }
    }
  }
  
  if (iterationCount >= maxIterations) {
    console.warn('Maximum iterations reached during validation');
  }
  
  // 最終検証結果をログ出力
  const finalConflicts = detectParallelConflicts(fixedSteps);
  const finalGaps = detectTimeGaps(fixedSteps);
  
  console.log(`=== Validation Complete ===`);
  console.log(`Final conflicts: ${finalConflicts.length}`);
  console.log(`Final gaps: ${finalGaps.length}`);
  console.log(`Total iterations: ${iterationCount}`);
  
  return fixedSteps;
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
- 材料は料理別（dishLabel別）に正確な分量を記載（例：「鶏もも肉 200g」「玉ねぎ 1/2個」）
- 各料理（A, B, C等）に対応する材料を分けて記載
- 手順は具体的で再現可能な内容
- 調理のポイントやコツを必ず含める
- 工程は実際の調理時間を正確に設定
- 並行作業は実用的で安全なもののみ

【出力形式】
以下のJSON形式で回答してください：

{
  "title": "献立名（例：鶏の香味焼きと具だくさんスープ）",
  "menuItems": ["メニュー1", "メニュー2"],
  "ingredients": {
    "A": ["鶏もも肉 200g", "玉ねぎ 1/2個", "にんじん 1/3本"],
    "B": ["豚バラ肉 150g", "キャベツ 1/4個", "にんにく 1片"]
  },
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
- 並行作業の判定基準：
  * 異なる料理（dishLabel）の工程は基本的に並行可能
  * 同じ料理内でも、使用材料が異なり、調理器具が競合しない場合は並行可能
  * 例：煮込み中（手を動かさない）に野菜を切る（手を動かす）→ 並行可能
  * 例：野菜を切る（手を動かす）と肉を下味付けする（手を動かす）→ 並行不可
  * 例：A料理の玉ねぎを切る + B料理のトマトを切る → 並行可能（異なる料理）
  * 例：A料理の玉ねぎを切る + A料理の鶏肉を切る → 並行不可（同じ料理で材料競合）
- 待ち時間（煮込み、水にさらす、冷ますなど）を積極的に活用
- dependencies: この工程の前に完了すべき工程のid配列
- startTime: 0で設定してください（後で自動計算されます）
- dishLabel: この工程がどの料理に対応するか（A, B, C等）を指定してください
- canParallel: この工程が他の工程と並行実行可能かどうか（材料・器具競合を考慮）

【注意事項】
- 必ずJSON形式で回答し、他のテキストは含めないでください
- 定番料理を避け、創造的な献立を提案してください
- 材料の分量は正確に記載してください
- 手順は初心者でも再現できるよう具体的に記載してください

重要：上記のJSON形式のみで回答してください。説明文やその他のテキストは一切含めないでください。`;

    console.log('Calling OpenAI API...');
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
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
      temperature: 0.7, // 精度を重視して少し下げる
      max_tokens: 3000, // より詳細なレシピ生成のため増加
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
    
    // 材料が配列形式（旧形式）の場合は料理別形式に変換
    if (Array.isArray(recipe.ingredients)) {
      const ingredientsByDish: { [key: string]: string[] } = {};
      
      // 工程から料理ラベルを取得
      const dishLabels = new Set<string>();
      if (recipe.steps && recipe.steps.length > 0) {
        recipe.steps.forEach((step: RecipeStep) => {
          if (step.dishLabel) {
            dishLabels.add(step.dishLabel);
          }
        });
      }
      
      // 料理ラベルがない場合はAとして扱う
      if (dishLabels.size === 0) {
        dishLabels.add('A');
      }
      
      // 材料を料理別に分散（簡易的な分散ロジック）
      const ingredientsPerDish = Math.ceil(recipe.ingredients.length / dishLabels.size);
      const dishLabelArray = Array.from(dishLabels);
      
      dishLabelArray.forEach((label, index) => {
        const startIndex = index * ingredientsPerDish;
        const endIndex = Math.min(startIndex + ingredientsPerDish, recipe.ingredients.length);
        ingredientsByDish[label] = recipe.ingredients.slice(startIndex, endIndex);
      });
      
      recipe.ingredients = ingredientsByDish;
    }
    
    // 工程の最適化を固定ロジックで実行（LLMから委譲）
    if (recipe.steps && recipe.steps.length > 0) {
      console.log('=== Original Steps Data ===');
      console.log(JSON.stringify(recipe.steps, null, 2));
      
      // 1. 最初の最適化（依存関係の計算）
      recipe.steps = optimizeSteps(recipe.steps);
      
      // 2. 検証と修正（空白時間の詰め、並行処理矛盾の解決）
      recipe.steps = validateAndFixSteps(recipe.steps);
      
      console.log('=== Final Optimized Steps Data ===');
      console.log(JSON.stringify(recipe.steps, null, 2));
      
      // 3. 最終的な最適化時間を計算
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

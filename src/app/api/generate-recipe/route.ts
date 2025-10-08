import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    console.log('API called - checking environment variables...');
    console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
    
    const { ingredients, familyMembers, familyAges, genre } = await request.json();
    console.log('Received data:', { ingredients, familyMembers, familyAges, genre });

    if (!ingredients || ingredients.length === 0) {
      return NextResponse.json(
        { error: '食材が指定されていません' },
        { status: 400 }
      );
    }

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

    const prompt = `
あなたは料理の専門家です。以下の条件に基づいて、美味しくて手軽な一食分の献立を提案してください。

【条件】
- 使用可能な食材: ${ingredients.join(', ')}
- 家族構成: ${familyMembers || '未指定'}
- 年齢構成: ${familyAges || '未指定'}
${genreCondition}
- 調理時間: 1時間以内
- 手軽で作りやすい料理
- 栄養バランスを考慮
- 一食として成立する献立（丼物など一品で完結するものも可）
- 分量以上の食材を使っても構いません（買い増しOK）

【出力形式】
以下のJSON形式で回答してください：

{
  "title": "献立名（例：親子丼と味噌汁）",
  "menuItems": ["メニュー1", "メニュー2"],
  "ingredients": ["材料1", "材料2", "材料3"],
  "instructions": ["手順1", "手順2", "手順3"],
  "tips": ["コツ1", "コツ2"],
  "servings": "人数分（例：4人分）",
  "totalTime": "準備から完成まで（例：30分）"
}

【注意事項】
- 一食として成立する献立を提案してください（丼物+汁物、定食スタイルなど）
- 材料は具体的な分量を含めて記載してください
- 手順は分かりやすく、順序立てて説明してください
- コツは料理を美味しく作るためのポイントを記載してください
- 総時間は準備から完成までを正確に記載してください
- 人数分は家族構成に合わせて調整してください
- 必ずJSON形式で回答し、他のテキストは含めないでください
`;

    console.log('Calling OpenAI API...');
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "あなたは料理の専門家です。ユーザーの要求に応じて、美味しくて手軽な献立を提案してください。必ず指定されたJSON形式で回答してください。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });
    console.log('OpenAI API response received');

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('AIからの応答がありません');
    }

    // JSONをパース
    let recipe;
    try {
      recipe = JSON.parse(response);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Response:', response);
      throw new Error('AIの応答を解析できませんでした');
    }

    // 必要なフィールドが存在するかチェック
    const requiredFields = ['title', 'menuItems', 'ingredients', 'instructions', 'tips', 'servings', 'totalTime'];
    for (const field of requiredFields) {
      if (!recipe[field]) {
        throw new Error(`レシピに${field}が含まれていません`);
      }
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

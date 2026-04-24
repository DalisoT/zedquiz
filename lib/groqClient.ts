import { cacheQuestion, getCachedQuestion, queueAttempt, isOnline, onOnline, onOffline } from './offlineStore';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export interface MarkingResult {
  score: number; maxScore: number; feedback: string;
  correctPoints: string[]; missedPoints: string[];
}

const STRICTNESS = {
  primary: 'Be VERY lenient. Award marks for partial understanding.',
  lower_secondary: 'Be moderate. Forgive minor mistakes.',
  upper_secondary: 'Be reasonably strict. Expect good accuracy.',
  advanced: 'Be strict and precise.',
};

export async function markAnswer(
  questionText: string, studentAnswer: string,
  markingScheme: { point: string; marks: number }[],
  answerType: 'objective' | 'structured' | 'essay',
  difficultyLevel: string, className: string
): Promise<MarkingResult> {
  const apiKey = process.env.GROQ_API_KEY;
  const online = isOnline();

  if (!apiKey || !online) {
    return simulateMarking(studentAnswer, markingScheme, answerType);
  }

  const level = className.includes('Grade 1') || className.includes('Grade 2') ? 'primary'
    : className.includes('Grade 4') || className.includes('Form 1') ? 'lower_secondary'
    : className.includes('Form 3') || className.includes('Form 4') ? 'upper_secondary' : 'advanced';

  const system = `You are a Zambian ECZ examiner. ${STRICTNESS[level as keyof typeof STRICTNESS]}
Total marks: ${markingScheme.reduce((s, m) => s + m.marks, 0)}.
Respond ONLY with JSON: {"score": number, "correctPoints": [], "missedPoints": [], "feedback": ""}`;

  try {
    const res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: system }, { role: 'user', content: `Q: ${questionText}\nA: ${studentAnswer}` }],
        temperature: 0.3,
      }),
    });
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      const m = content.match(/\{[\s\S]*?\}/)?.[0];
      if (m) {
        const p = JSON.parse(m);
        return { score: Math.min(Math.max(0, p.score || 0), markingScheme.reduce((s, m) => s + m.marks, 0)), maxScore: markingScheme.reduce((s, m) => s + m.marks, 0), feedback: p.feedback || '', correctPoints: p.correctPoints || [], missedPoints: p.missedPoints || [] };
      }
    }
  } catch (e) { console.error(e); }
  return simulateMarking(studentAnswer, markingScheme, answerType);
}

function simulateMarking(answer: string, scheme: { point: string; marks: number }[], type: string): MarkingResult {
  const maxScore = scheme.reduce((s, m) => s + m.marks, 0);
  let score = 0, correct: string[] = [], missed: string[] = [];
  const a = answer.toLowerCase().trim();

  if (type === 'objective') {
    const first = a.charAt(0).toUpperCase();
    const correctAns = scheme[0]?.point?.charAt(0).toUpperCase();
    if (first === correctAns) { score = maxScore; correct.push(scheme[0].point); }
    else missed.push(scheme[0].point);
  } else {
    for (const s of scheme) {
      const keywords = s.point.toLowerCase().split(' ').filter(w => w.length > 3);
      const match = keywords.filter(k => a.includes(k)).length / keywords.length;
      if (match >= 0.5) { score += Math.ceil(s.marks * match); correct.push(s.point); }
      else missed.push(s.point);
    }
  }

  const feedback = score === maxScore ? 'Excellent!' : score >= maxScore * 0.7 ? 'Good job!' : score >= maxScore * 0.4 ? 'Keep practicing!' : 'Focus on key concepts.';
  return { score, maxScore, feedback, correctPoints: correct, missedPoints: missed };
}
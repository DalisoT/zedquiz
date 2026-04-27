const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function getGroqCompletion(
  question: string,
  userAnswer: string,
  markingScheme: any
): Promise<{ correct: boolean; explanation: string }> {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are an AI tutor marking Zambian ECZ exam answers. Evaluate the student's answer against the marking scheme. Respond ONLY with valid JSON in this format: {"correct": true/false, "explanation": "Your feedback explanation"}`
        },
        {
          role: 'user',
          content: `Question: ${question}\n\nStudent's Answer: ${userAnswer}\n\nMarking Scheme: ${JSON.stringify(markingScheme)}\n\nEvaluate if the student's answer is correct based on the marking scheme points. Provide encouraging, educational feedback.`
        }
      ],
      temperature: 0.3,
      max_tokens: 500,
    }),
  });

  if (!response.ok) throw new Error('Groq API error');
  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}
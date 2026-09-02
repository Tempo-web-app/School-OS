export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { input = '', mode = 'explain' } = req.body || {};
  if (!String(input).trim()) return res.status(400).json({ error: 'Missing study material' });
  const key = process.env.AI_API_KEY;
  if (!key) return res.status(503).json({ error: 'AI is not configured yet. Add AI_API_KEY in Vercel environment variables.' });
  const base = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
  const model = process.env.AI_MODEL || 'gpt-4o-mini';
  const prompts = {
    explain: 'Teach the student this material clearly. Start with the core idea, then simple explanation, example, common mistake, and 3 recall questions. Do not simply give homework answers.',
    summary: 'Summarize the material into a compact study guide with headings, key facts, definitions and a final recall checklist.',
    quiz: 'Create 8 useful practice questions from the material. Mix recall, application and one harder question. Include an answer key after the questions.',
    plan: 'Turn the material into a realistic study plan. Break it into short sessions, active recall, practice and review. Prioritize weak concepts.'
  };
  const system = prompts[mode] || prompts.explain;
  try {
    const r = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, temperature: 0.3, messages: [{ role: 'system', content: `You are the School OS study assistant. ${system}` }, { role: 'user', content: String(input).slice(0, 18000) }] })
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || 'AI provider error' });
    return res.status(200).json({ text: data?.choices?.[0]?.message?.content || 'No response generated.' });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'AI request failed' });
  }
}
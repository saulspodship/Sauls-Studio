// Vercel Serverless Function: GET /api/health
export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Use GET.' });
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    ok: true,
    scriptProvider: Boolean(process.env.OPENROUTER_API_KEY),
    scriptMode: process.env.OPENROUTER_API_KEY ? 'OpenRouter' : 'local draft',
    renderProvider: false,
    deployment: 'vercel'
  });
}

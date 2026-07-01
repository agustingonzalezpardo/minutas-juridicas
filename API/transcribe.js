export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const OPENAI_KEY = process.env.OPENAI_KEY;
    if (!OPENAI_KEY) throw new Error('OPENAI_KEY no configurada en Vercel');

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + OPENAI_KEY,
        'Content-Type': req.headers['content-type'],
      },
      body: buffer,
    });

    const text = await response.text();
    if (!response.ok) return res.status(response.status).send(text);
    res.status(200).send(text);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { transcript, fecha, hora } = req.body;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: `Eres un abogado chileno experto en minutas de audiencia de juicio. A partir de la transcripción redacta la minuta formal con este formato exacto y si un campo no aparece escribe (no mencionado). Responde SOLO con la minuta.\n\nFecha: ${fecha}  Hora: ${hora}`,
        messages: [{ role: 'user', content: 'Transcripción:\n\n' + transcript }],
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    const minuta = data.content?.map(c => c.text || '').join('').trim();
    res.status(200).json({ minuta });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

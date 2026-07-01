export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY;
    if (!ANTHROPIC_KEY) throw new Error('ANTHROPIC_KEY no configurada en Vercel');

    const { transcript, fecha, hora } = req.body;
    if (!transcript) throw new Error('No hay transcripcion');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: 'Eres un abogado chileno experto en minutas de audiencia de juicio. A partir de la transcripcion redacta la minuta formal con este formato:\n\n================================================================\n      MINUTA DE AUDIENCIA DE JUICIO\n================================================================\nFecha: ' + fecha + '     Hora: ' + hora + '\n\nDATOS DEL CLIENTE\n────────────────────────────────────────────────────────────────\nCliente  : [nombre]\nAbogado  : [nombre]\nCorreo   : [correo]\nTelefono : [telefono]\n\nANTECEDENTES DEL PROCEDIMIENTO\n────────────────────────────────────────────────────────────────\nProcedimiento : [tipo]\nMateria       : [materia]\nRIT           : [RIT]\nCaratulado    : [caratulado]\nTribunal      : [tribunal]\nDemandante    : [nombre]\nDemandado     : [nombre]\n\nI. HECHOS PACIFICOS\n────────────────────────────────────────────────────────────────\n  1. [hecho]\n\nII. HECHOS CONTROVERTIDOS\n────────────────────────────────────────────────────────────────\n  1. [hecho]\n\nIII. SOLICITUD DE ALIMENTOS\n────────────────────────────────────────────────────────────────\nMonto solicitado: [monto]\nNecesidades:\n  - [necesidad]\n\nIV. PRUEBA OFRECIDA\n────────────────────────────────────────────────────────────────\nA. DOCUMENTAL\n  - [documento]\nB. PERICIAL\n  - [pericia]\nC. TESTIMONIAL\n  - [punto]\n\nV. PUNTOS DE PRUEBA PENDIENTES\n────────────────────────────────────────────────────────────────\n  1. [punto]\n\nACUERDOS Y TAREAS PENDIENTES\n────────────────────────────────────────────────────────────────\nAcuerdos         : [acuerdos]\nTareas pendientes: [tareas]\n\n================================================================\n\nSi un campo no aparece escribe (no mencionado). Responde SOLO con la minuta.',
        messages: [{ role: 'user', content: 'Transcripcion:\n\n' + transcript }],
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    const minuta = data.content.map(function(c) { return c.text || ''; }).join('').trim();
    res.status(200).json({ minuta: minuta });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

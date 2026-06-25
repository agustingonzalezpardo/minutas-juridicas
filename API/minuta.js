// api/minuta.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    const { transcript, fecha, hora } = req.body;
    if (!transcript) throw new Error('No hay transcripción');

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) throw new Error('Clave de Anthropic no configurada');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: `Eres un abogado chileno experto en redactar minutas de audiencia de juicio.
A partir de la transcripción, extrae la información relevante y redacta una minuta formal.

La minuta DEBE tener exactamente este formato:

================================================================
      MINUTA DE AUDIENCIA DE JUICIO — PARTE DEMANDANTE
================================================================
Fecha: ${fecha}     Hora: ${hora}

DATOS DEL CLIENTE
────────────────────────────────────────────────────────────────
Cliente  : [nombre]
Abogado  : [nombre]
Correo   : [correo]
Teléfono : [teléfono]

ANTECEDENTES DEL PROCEDIMIENTO
────────────────────────────────────────────────────────────────
Procedimiento : [tipo]
Materia       : [materia]
RIT           : [RIT]
Caratulado    : [caratulado]
Tribunal      : [tribunal]
Demandante    : [nombre]
Demandado     : [nombre]

I. HECHOS PACÍFICOS
────────────────────────────────────────────────────────────────
  1. [hecho]
  2. [hecho]

II. HECHOS CONTROVERTIDOS
────────────────────────────────────────────────────────────────
  1. [hecho]
  2. [hecho]

III. SOLICITUD DE ALIMENTOS
────────────────────────────────────────────────────────────────
Monto solicitado: [monto]
Necesidades del alimentario:
  − [necesidad]
  − [necesidad]

IV. PRUEBA OFRECIDA
────────────────────────────────────────────────────────────────
A. DOCUMENTAL
  − [documento]
B. PERICIAL
  − [pericia]
C. TESTIMONIAL
  − [punto testimonial]

V. PUNTOS DE PRUEBA PENDIENTES
────────────────────────────────────────────────────────────────
  1. [punto]
  2. [punto]

ACUERDOS Y TAREAS PENDIENTES
────────────────────────────────────────────────────────────────
Acuerdos         : [acuerdos]
Tareas pendientes: [tareas]

================================================================

Responde SOLO con la minuta, sin explicaciones adicionales.`,
        messages: [{ role: 'user', content: `Aquí está la transcripción:\n\n${transcript}` }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || `Error HTTP ${response.status}`);
    }

    const data = await response.json();
    const minutaText = data.content?.map(c => c.text).join('') || '';
    return res.status(200).json({ minuta: minutaText });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message || 'Error al generar minuta' });
  }
}

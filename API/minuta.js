// api/minuta.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { transcript, fecha, hora } = req.body;

    if (!transcript || transcript.trim() === '') {
      return res.status(400).json({ error: 'No hay transcripción para generar la minuta' });
    }

    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
    if (!ANTHROPIC_API_KEY) {
      console.error('❌ ANTHROPIC_API_KEY no configurada');
      return res.status(500).json({ error: 'Clave de Anthropic no configurada en el servidor' });
    }

    console.log('📤 Generando minuta con Anthropic...');

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

    const responseText = await response.text();
    console.log(`📥 Respuesta de Anthropic: status ${response.status}`);

    if (!response.ok) {
      let errorMessage = `Error HTTP ${response.status}`;
      try {
        const errorJson = JSON.parse(responseText);
        errorMessage = errorJson?.error?.message || errorMessage;
      } catch (e) {
        errorMessage = responseText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      throw new Error('La respuesta de Anthropic no es JSON válido');
    }

    const minutaText = data.content?.map(c => c.text).join('') || '';
    if (!minutaText) {
      throw new Error('La minuta generada está vacía');
    }

    console.log('✅ Minuta generada');
    return res.status(200).json({ minuta: minutaText });

  } catch (error) {
    console.error('❌ Error en minuta:', error);
    return res.status(500).json({ error: error.message || 'Error al generar la minuta' });
  }
}

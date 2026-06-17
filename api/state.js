function sendJson(response, statusCode, body) {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify(body))
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = ''
    request.on('data', (chunk) => {
      body += chunk
      if (body.length > 500_000) { // allow up to 500kb state
        reject(new Error('Payload too large.'))
        request.destroy()
      }
    })
    request.on('end', () => resolve(body))
    request.on('error', reject)
  })
}

async function executeKvCommand(command) {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  if (!url || !token) {
    throw new Error('Vercel KV is not configured.')
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`KV REST error: ${response.status} - ${text}`)
  }

  const data = await response.json()
  return data.result
}

export default async function handler(request, response) {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN

  if (!url || !token) {
    // Return 503 so frontend knows to fall back to LocalStorage
    sendJson(response, 503, { error: 'Vercel KV is not configured on this environment.' })
    return
  }

  try {
    if (request.method === 'GET') {
      const result = await executeKvCommand(['GET', 'airi_studio_state'])
      if (!result) {
        sendJson(response, 200, { state: null })
        return
      }
      let parsed = null
      try {
        parsed = JSON.parse(result)
      } catch {
        parsed = result
      }
      sendJson(response, 200, { state: parsed })
      return
    }

    if (request.method === 'POST') {
      const rawBody = await readBody(request)
      const payload = JSON.parse(rawBody || '{}')
      const state = payload.state

      if (!state) {
        sendJson(response, 400, { error: 'Missing state parameter.' })
        return
      }

      await executeKvCommand(['SET', 'airi_studio_state', JSON.stringify(state)])
      sendJson(response, 200, { success: true })
      return
    }

    sendJson(response, 405, { error: 'Method not allowed.' })
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : 'Unexpected serverless state error.',
    })
  }
}

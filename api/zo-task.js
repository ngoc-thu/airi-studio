const roleInstructions = {
  research: 'Research the request, identify useful sources, constraints, and unknowns. Return concise findings only.',
  plan: 'Turn the research/request into a concrete implementation plan with ordered steps, files, checks, and risks.',
  code: 'Implement or describe the code changes needed, including important files and risks.',
  review: 'Review the completed work for bugs, regressions, edge cases, and missing verification.',
}

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
      if (body.length > 12_000) {
        reject(new Error('Request body is too large.'))
        request.destroy()
      }
    })

    request.on('end', () => resolve(body))
    request.on('error', reject)
  })
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'Method not allowed.' })
    return
  }

  const apiKey = process.env.ZO_API_KEY
  if (!apiKey) {
    sendJson(response, 503, { error: 'ZO_API_KEY is not configured.' })
    return
  }

  try {
    const rawBody = await readBody(request)
    const payload = JSON.parse(rawBody || '{}')
    const task = payload.task ?? {}
    const agent = payload.agent ?? {}
    const conversationId = payload.conversationId ?? payload.conversation_id ?? null
    const followUp = typeof payload.followUp === 'string' ? payload.followUp.trim() : ''

    if (!task.label || !task.type || !agent.name || !agent.title) {
      sendJson(response, 400, { error: 'Missing task or agent fields.' })
      return
    }

    const input = followUp
      ? [
          'Continue the existing Airi Studio Zoo Computer session.',
          `Agent: ${agent.name} (${agent.title})`,
          `Task label: ${task.label}`,
          `Task type: ${task.type}`,
          '',
          'User follow-up:',
          followUp,
          '',
          'Return a compact follow-up result that can be shown inside the Airi Studio Zoo Computer panel.',
        ].join('\n')
      : [
          'You are receiving a real work request from Airi Studio.',
          `Agent: ${agent.name} (${agent.title})`,
          `Task type: ${task.type}`,
          `Task label: ${task.label}`,
          `Difficulty: ${task.difficulty ?? 'unknown'}`,
          `Reward: ${task.reward ?? 'unknown'} credits`,
          '',
          roleInstructions[task.type] ?? 'Handle the task carefully and return a concise result.',
          'Return a compact result that can be shown inside the Airi Studio Zoo Computer panel.',
        ].join('\n')

    const zoResponse = await fetch('https://api.zo.computer/zo/ask', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(conversationId ? { input, conversation_id: conversationId } : { input }),
    })

    const responseText = await zoResponse.text()
    let data
    try {
      data = JSON.parse(responseText)
    } catch {
      data = { output: responseText }
    }

    if (!zoResponse.ok) {
      sendJson(response, zoResponse.status, {
        error: data?.error ?? data?.message ?? 'Zo API request failed.',
      })
      return
    }

    sendJson(response, 200, {
      output: data?.output ?? 'Zo completed the task.',
      conversationId: data?.conversation_id ?? data?.conversationId ?? null,
    })
  } catch (error) {
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : 'Unexpected Zo proxy error.',
    })
  }
}

import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'

function sendJson(res: { statusCode: number; setHeader: (name: string, value: string) => void; end: (body: string) => void }, statusCode: number, body: unknown) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function zoDevProxyPlugin(apiKey?: string): Plugin {
  return {
    name: 'zo-dev-proxy',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/zo-task', async (req, res, next) => {
        if (req.method !== 'POST') {
          next()
          return
        }

        let body = ''
        for await (const chunk of req) body += chunk

        const payload: {
          task?: Record<string, unknown>
          agent?: Record<string, unknown>
          conversationId?: string
          conversation_id?: string
          followUp?: string
        } = (() => {
          try {
            return JSON.parse(body || '{}') as {
              task?: Record<string, unknown>
              agent?: Record<string, unknown>
              conversationId?: string
              conversation_id?: string
              followUp?: string
            }
          } catch {
            return {}
          }
        })()

        const task = payload.task ?? {}
        const agent = payload.agent ?? {}
        const conversationId = payload.conversationId ?? payload.conversation_id ?? null
        const followUp = typeof payload.followUp === 'string' ? payload.followUp.trim() : ''

        if (!task.label || !task.type || !agent.name || !agent.title) {
          sendJson(res, 400, { error: 'Missing task or agent fields.' })
          return
        }

        if (!apiKey) {
          const output = [
            `Dev mock accepted: ${task.label}`,
            `Assigned to ${agent.name} (${agent.title})`,
            '',
            'ZO_API_KEY is missing locally, so this request is using the development stub.',
            'Add ZO_API_KEY to .env.local to send real requests to Zoo Computer.',
          ].join('\n')

          sendJson(res, 200, {
            output,
            conversationId: `dev-${task.type}-${task.id ?? 'new'}`,
          })
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
              'Return a compact result that can be shown inside the Airi Studio Zoo Computer panel.',
            ].join('\n')

        try {
          const zoResponse = await fetch('https://api.zo.computer/zo/ask', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(conversationId ? { input, conversation_id: conversationId } : { input }),
          })

          const responseText = await zoResponse.text()
          let data: Record<string, unknown>
          try {
            data = JSON.parse(responseText) as Record<string, unknown>
          } catch {
            data = { output: responseText }
          }

          if (!zoResponse.ok) {
            sendJson(res, zoResponse.status, {
              error: data?.error ?? data?.message ?? 'Zo API request failed.',
            })
            return
          }

          sendJson(res, 200, {
            output: data?.output ?? 'Zo completed the task.',
            conversationId: data?.conversation_id ?? data?.conversationId ?? null,
          })
        } catch (error) {
          sendJson(res, 500, {
            error: error instanceof Error ? error.message : 'Unexpected Zo proxy error.',
          })
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), zoDevProxyPlugin(env.ZO_API_KEY)],
  }
})

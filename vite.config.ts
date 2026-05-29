import { defineConfig, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'

function zoDevMockPlugin(): Plugin {
  return {
    name: 'zo-dev-mock',
    configureServer(server: ViteDevServer) {
      server.middlewares.use('/api/zo-task', async (req, res, next) => {
        if (req.method !== 'POST') {
          next()
          return
        }

        let body = ''
        for await (const chunk of req) body += chunk

        let payload: any = {}
        try {
          payload = JSON.parse(body || '{}')
        } catch {
          payload = {}
        }

        const task = payload.task ?? {}
        const agent = payload.agent ?? {}
        if (!task.label || !task.type || !agent.name || !agent.title) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Missing task or agent fields.' }))
          return
        }

        const output = [
          `Dev mock accepted: ${task.label}`,
          `Assigned to ${agent.name} (${agent.title})`,
          '',
          'Use this local stub to validate the live-handoff UI before deploying.',
          'After the UI feels right, Vercel will call the real /api/zo-task function.',
        ].join('\n')

        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(
          JSON.stringify({
            output,
            conversationId: `dev-${task.type}-${task.id ?? 'new'}`,
          }),
        )
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), zoDevMockPlugin()],
})

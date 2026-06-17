import { useEffect, useRef, useState } from 'react'
import './App.css'
import type {
  Agent,
  AgentRole,
  AgentInspect,
  Metrics,
  Task,
  TaskPriority,
  TaskType,
  ZoSession,
} from './types'
import {
  baseAgents,
  dashboardMascots,
  furniture,
  stationPositions,
  taskLabels,
  taskPriorityLabels,
  taskSourceLabels,
  zoStatusLabels,
  roleResultCards,
  STORAGE_KEYS,
} from './constants'
import {
  createTask,
  getAgentPosition,
  makeInitialLog,
  makeInitialNextTaskId,
  makeInitialSelectedTask,
  makeInitialSelectedZoTaskId,
  makeInitialTasks,
  makeInitialZoSessions,
  priorityRank,
  getLatestZoAssistantOutput,
  makeZoSummary,
  extractZoActions,
  makeZoInsights,
  interpolateRoute,
} from './helpers'
import { FurnitureItem } from './components/FurnitureItem'
import { TaskModal } from './components/TaskModal'

function App() {
  const [agents] = useState(baseAgents)
  const [tasks, setTasks] = useState(makeInitialTasks)
  const [selectedTask, setSelectedTask] = useState<number | null>(makeInitialSelectedTask)
  const [nextTaskId, setNextTaskId] = useState(makeInitialNextTaskId)
  const [requestTitle, setRequestTitle] = useState('')
  const [requestType, setRequestType] = useState<TaskType>('plan')
  const [requestPriority, setRequestPriority] = useState<TaskPriority>('high')
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [, setMetrics] = useState<Metrics>({
    day: 1,
    done: 0,
    failed: 0,
    tokens: 320,
    happiness: 72,
    credits: 18,
  })
  const [log, setLog] = useState<string[]>(makeInitialLog)
  const [mascotTick, setMascotTick] = useState(0)
  const [mascotBubble, setMascotBubble] = useState<{ [id: string]: boolean }>({})
  const [inspectedAgent, setInspectedAgent] = useState<AgentInspect | null>(null)
  const [selectedAgentId, setSelectedAgentId] = useState<AgentRole | null>(null)
  const [zoSessions, setZoSessions] = useState<ZoSession[]>(makeInitialZoSessions)
  const [selectedZoTaskId, setSelectedZoTaskId] = useState<number | null>(makeInitialSelectedZoTaskId)
  const [zoFollowUp, setZoFollowUp] = useState('Continue the research with next steps and unresolved questions.')
  const [zooChatPrompt, setZooChatPrompt] = useState('')
  const [screen, setScreen] = useState<'dashboard' | 'tasks' | 'chat' | 'sessions' | 'documents' | 'logs'>('dashboard')
  const [chatSignal, setChatSignal] = useState<'idle' | 'working' | 'received'>('idle')
  const [isKvLoaded, setIsKvLoaded] = useState(false)
  const handleMascotClick = (id: string) => {
    setMascotBubble((prev) => ({ ...prev, [id]: true }))
    setTimeout(() => {
      setMascotBubble((prev) => ({ ...prev, [id]: false }))
    }, 2500)
  }
  const lastAssistantMessageIdRef = useRef<string | null>(null)
  const chatThreadRef = useRef<HTMLDivElement | null>(null)

  const selected = tasks.find((task) => task.id === selectedTask) ?? null
  const queuedTasks = tasks
    .filter((task) => task.state === 'queued')
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || b.id - a.id)
  const activeTasks = tasks.filter((task) => task.state === 'active')
  const visibleZoSessions = zoSessions.slice(0, 4)
  const selectedZoSession = selectedZoTaskId == null
    ? null
    : (zoSessions.find((session) => session.taskId === selectedZoTaskId) ?? null)
  const activeZoSession = selectedZoSession ?? visibleZoSessions[0] ?? null

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.tasks, JSON.stringify(tasks))
  }, [tasks])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.selectedTask, JSON.stringify(selectedTask))
  }, [selectedTask])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.nextTaskId, JSON.stringify(nextTaskId))
  }, [nextTaskId])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.log, JSON.stringify(log))
  }, [log])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMascotTick((tick) => tick + 1)
    }, 220)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.zoSessions, JSON.stringify(zoSessions))
  }, [zoSessions])

  // Vercel KV: Asynchronously load initial state from server on mount
  useEffect(() => {
    async function loadServerState() {
      try {
        const response = await fetch('/api/state')
        if (response.ok) {
          const data = await response.json()
          if (data && data.state) {
            const { tasks: sTasks, zoSessions: sSessions, log: sLog, nextTaskId: sNextTaskId } = data.state
            if (sTasks) setTasks(sTasks)
            if (sSessions) setZoSessions(sSessions)
            if (sLog) setLog(sLog)
            if (sNextTaskId) setNextTaskId(sNextTaskId)
          }
        }
      } catch (err) {
        console.warn('Failed to load state from Vercel KV, falling back to localStorage:', err)
      } finally {
        setIsKvLoaded(true)
      }
    }
    loadServerState()
  }, [])

  // Vercel KV: Debounced autosave state to server on updates
  useEffect(() => {
    if (!isKvLoaded) return

    const timer = setTimeout(async () => {
      try {
        await fetch('/api/state', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            state: {
              tasks,
              zoSessions,
              log,
              nextTaskId,
            },
          }),
        })
      } catch (err) {
        console.error('Failed to sync state to Vercel KV:', err)
      }
    }, 1500)

    return () => clearTimeout(timer)
  }, [tasks, zoSessions, log, nextTaskId, isKvLoaded])

  useEffect(() => {
    const session = selectedZoSession
    if (!session) {
      setChatSignal('idle')
      lastAssistantMessageIdRef.current = null
      return
    }

    const latestAssistantMessage = [...(session.messages ?? [])].reverse().find((message) => message.role === 'assistant')

    if (session.status === 'working') {
      setChatSignal('working')
    } else if (latestAssistantMessage && latestAssistantMessage.id !== lastAssistantMessageIdRef.current) {
      lastAssistantMessageIdRef.current = latestAssistantMessage.id
      setChatSignal('received')
      const timeoutId = window.setTimeout(() => setChatSignal('idle'), 2600)
      return () => window.clearTimeout(timeoutId)
    } else {
      setChatSignal('idle')
      if (latestAssistantMessage) lastAssistantMessageIdRef.current = latestAssistantMessage.id
    }
  }, [selectedZoSession])

  useEffect(() => {
    if (!chatThreadRef.current) return
    chatThreadRef.current.scrollTop = chatThreadRef.current.scrollHeight
  }, [selectedZoSession?.messages, chatSignal])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.selectedZoTaskId, JSON.stringify(selectedZoTaskId))
  }, [selectedZoTaskId])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTasks((currentTasks) => {
        let completed: Task[] = []
        let failed: Task[] = []

        const updated = currentTasks
          .map((task) => {
            if (task.state !== 'active' || !task.assignedTo) return task
            const agent = agents.find((item) => item.id === task.assignedTo)
            if (!agent) return task

            const isMatched = agent.id === task.type
            const speedBonus = isMatched ? 1 : 0.62
            const nextProgress = task.progress + agent.speed * speedBonus * 0.26

            if (nextProgress < task.difficulty) {
              return { ...task, progress: nextProgress }
            }

            const quality = agent.accuracy + (isMatched ? 8 : -18) + Math.random() * 16
            const result = { ...task, progress: task.difficulty }
            if (quality >= 78) {
              completed = [...completed, result]
              return { ...result, state: 'done' as const }
            }

            failed = [...failed, result]
            return { ...result, state: 'failed' as const }
          })
          .filter((task) => task.state === 'queued' || task.state === 'active')

        if (completed.length || failed.length) {
          setMetrics((state) => {
            const reward = completed.reduce((total, task) => total + task.reward, 0)
            return {
              ...state,
              done: state.done + completed.length,
              failed: state.failed + failed.length,
              credits: state.credits + reward,
              tokens: Math.max(0, state.tokens - completed.length * 10 - failed.length * 16),
              happiness: Math.max(
                0,
                Math.min(100, state.happiness + completed.length * 3 - failed.length * 8),
              ),
            }
          })

          setLog((items) => [
            ...completed.map((task) => `[TASK] ${task.label} completed. Reward +${task.reward} credits.`),
            ...failed.map((task) => `[ERROR] ${task.label} failed review. Bug debt increased and needs follow-up.`),
            ...items,
          ].slice(0, 7))
        }

        return updated
      })
    }, 33)

    return () => window.clearInterval(timer)
  }, [agents])

  useEffect(() => {
    if (!inspectedAgent) return undefined

    const timer = window.setTimeout(() => {
      setInspectedAgent((current) => (current?.tick === inspectedAgent.tick ? null : current))
    }, 2100)

    return () => window.clearTimeout(timer)
  }, [inspectedAgent])

  function inspectAgent(agent: Agent) {
    setSelectedAgentId(agent.id)
    setInspectedAgent((current) => ({
      agentId: agent.id,
      tick: (current?.tick ?? 0) + 1,
    }))
    setLog((items) => [
      `[SYSTEM] Agent check-in: ${agent.name} (${agent.title}) is at ${agent.focus}% focus.`,
      ...items,
    ].slice(0, 7))
  }

  function assignTask(agentId: AgentRole) {
    if (!selected) return
    const assignedAgent = agents.find((agent) => agent.id === agentId)
    if (!assignedAgent) return

    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === selected.id
          ? { ...task, state: 'active', assignedTo: agentId, progress: 0 }
          : task,
      ),
    )
    setSelectedTask(null)
    setSelectedZoTaskId(selected.id)
    setZoSessions((currentSessions) => [
      {
        taskId: selected.id,
        taskLabel: selected.label,
        taskType: selected.type,
        agentId,
        status: 'pending' as const,
        output: 'This task is staged locally. Confirm before sending a real request to Zo Computer.',
        summary: `${assignedAgent.name} is ready to take this request from the inbox.`,
        insights: [
          { label: 'Pipeline', value: taskLabels[selected.type] },
          { label: 'Agent', value: assignedAgent.name },
          { label: 'Priority', value: taskPriorityLabels[selected.priority] },
        ],
        actions: roleResultCards[selected.type].sections,
      },
      ...currentSessions.filter((session) => session.taskId !== selected.id),
    ].slice(0, 8))
    setLog((items) => [
      `[TASK] ${selected.label} assigned to ${assignedAgent.title}. Waiting for Zoo confirmation before live handoff.`,
      ...items,
    ].slice(0, 7))
  }

  function cancelZoTask(session: ZoSession) {
    setZoSessions((currentSessions) => currentSessions.filter((item) => item.taskId !== session.taskId))
    setSelectedZoTaskId((current) => (current === session.taskId ? null : current))
    setLog((items) => [`[SYSTEM] Live handoff cancelled for ${session.taskLabel}. Task remains local only.`, ...items].slice(0, 7))
  }

  function confirmZoTask(session: ZoSession) {
    const task = tasks.find((item) => item.id === session.taskId)
    const agent = agents.find((item) => item.id === session.agentId)
    if (!task || !agent || session.status !== 'pending') return

    setLog((items) => [`[ZOO] Sending ${task.label} to Zoo Computer for live processing.`, ...items].slice(0, 7))
    void sendTaskToZo(task, agent)
  }

  async function sendTaskToZo(task: Task, agent: Agent) {
    setZoSessions((currentSessions) =>
      currentSessions.map((session) =>
        session.taskId === task.id
          ? {
              ...session,
              status: 'working',
              summary: 'Zo Computer is processing this live request...',
              output: 'Zo accepted the request. Waiting for result...',
              insights: [
                { label: 'Pipeline', value: taskLabels[task.type] },
                { label: 'Agent', value: agent.name },
                { label: 'Mode', value: 'Live control' },
              ],
              actions: roleResultCards[task.type].sections,
            }
          : session,
      ),
    )

    try {
      const response = await fetch('/api/zo-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: {
            id: task.id,
            label: task.label,
            type: task.type,
            difficulty: task.difficulty,
            reward: task.reward,
          },
          agent: {
            id: agent.id,
            name: agent.name,
            title: agent.title,
          },
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error ?? 'Zo Computer request failed.')
      }

      const output = data?.output ?? 'Zo completed the task.'

      setZoSessions((currentSessions) =>
        currentSessions.map((session) =>
          session.taskId === task.id
            ? {
                ...session,
                status: 'done',
                output,
                summary: makeZoSummary(output),
                insights: makeZoInsights(task, agent, output),
                actions: extractZoActions(output, roleResultCards[task.type].sections),
                confidence: data?.confidence ?? Math.min(98, Math.max(62, agent.accuracy + (agent.id === task.type ? 4 : -10))),
                conversationId: data?.conversationId ?? null,
              }
            : session,
        ),
      )
      setLog((items) => [`[ZOO] ${task.label} returned a live result: ${makeZoSummary(output)}`, ...items].slice(0, 7))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Zo Computer request failed.'
      setZoSessions((currentSessions) =>
        currentSessions.map((session) =>
          session.taskId === task.id
            ? {
                ...session,
                status: 'failed',
                summary: 'Zo Computer could not complete this request.',
                output: message,
                insights: [
                  { label: 'Failure', value: 'Request error' },
                  { label: 'Agent', value: agent.name },
                  { label: 'Retry', value: 'Needed' },
                ],
                actions: ['Check API/protection settings', 'Retry the same task', 'Inspect Vercel function logs'],
              }
            : session,
        ),
      )
      setLog((items) => [`[ERROR] Live handoff failed for ${task.label}: ${message}`, ...items].slice(0, 7))
    }
  }

  async function continueZoSession(session: ZoSession, followUpOverride?: string) {
    const task = tasks.find((item) => item.id === session.taskId)
    const agent = agents.find((item) => item.id === session.agentId)
    const followUp = (followUpOverride ?? zoFollowUp).trim()

    if (!task || !agent || !session.conversationId || !followUp || session.status === 'working') return

    setZoSessions((currentSessions) =>
      currentSessions.map((item) =>
        item.taskId === session.taskId
          ? {
              ...item,
              status: 'working',
              summary: 'Zoo Computer is continuing this session...',
              output: `Follow-up sent: ${followUp}`,
              messages: [
                ...(item.messages ?? []),
                {
                  id: `user-${Date.now()}`,
                  role: 'user',
                  title: 'Follow-up',
                  body: followUp,
                },
                {
                  id: `system-${Date.now()}`,
                  role: 'system',
                  title: 'Zoo Computer',
                  body: 'Continuing the current session...',
                },
              ],
            }
          : item,
      ),
    )
    setLog((items) => [`[ZOO] Continuing session for ${session.taskLabel} with new follow-up input.`, ...items].slice(0, 7))

    try {
      const response = await fetch('/api/zo-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: {
            id: task.id,
            label: task.label,
            type: session.taskType,
            difficulty: task.difficulty,
            reward: task.reward,
          },
          agent: {
            id: agent.id,
            name: agent.name,
            title: agent.title,
          },
          conversationId: session.conversationId,
          followUp,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error ?? 'Zoo session continuation failed.')
      }

      const output = data?.output ?? 'Zoo Computer returned a follow-up result.'
      const summary = makeZoSummary(output)

      setZoSessions((currentSessions) =>
        currentSessions.map((item) =>
          item.taskId === session.taskId
            ? {
                ...item,
                status: 'done',
                output,
                summary,
                insights: makeZoInsights(task, agent, output),
                actions: extractZoActions(output, roleResultCards[session.taskType].sections),
                confidence: data?.confidence ?? item.confidence,
                conversationId: data?.conversationId ?? session.conversationId,
                messages: [
                  ...(item.messages ?? []).filter((message) => !(message.role === 'system' && message.body === 'Continuing the current session...')),
                  {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    title: 'Zoo response',
                    body: output,
                  },
                ],
              }
            : item,
        ),
      )
      setTasks((currentTasks) =>
        currentTasks.map((item) =>
          item.id === task.id
            ? {
                ...item,
                note: `Zoo session continued: ${summary}`,
              }
            : item,
        ),
      )
      setLog((items) => [`[ZOO] ${task.label} follow-up completed: ${summary}`, ...items].slice(0, 7))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected Zoo follow-up error.'
      setZoSessions((currentSessions) =>
        currentSessions.map((item) =>
          item.taskId === session.taskId
            ? {
                ...item,
                status: 'failed',
                output: message,
                summary: 'Zoo session follow-up did not complete.',
              }
            : item,
        ),
      )
      setLog((items) => [`[ERROR] Zoo follow-up failed for ${session.taskLabel}: ${message}`, ...items].slice(0, 7))
    }
  }

  async function sendTaskToResearch(task: Task) {
    const researcher = agents.find((agent) => agent.id === 'research')
    if (!researcher) return

    setSelectedZoTaskId(task.id)
    const researchSession: ZoSession = {
      taskId: task.id,
      taskLabel: task.label,
      taskType: 'research',
      agentId: 'research',
      status: 'working',
      output: 'Zoo Computer accepted the brief. Research intake is now gathering context...',
      summary: 'Enana is turning the intake brief into a research pass.',
      insights: [
        { label: 'Stage', value: 'Research intake' },
        { label: 'Agent', value: researcher.name },
        { label: 'Priority', value: taskPriorityLabels[task.priority] },
      ],
      actions: roleResultCards.research.sections,
      messages: [
        {
          id: `user-${task.id}`,
          role: 'user',
          title: 'Brief created',
          body: `${task.label}\n\n${task.note}`,
        },
        {
          id: `system-${task.id}`,
          role: 'system',
          title: 'Zoo Computer',
          body: 'Research intake started for this brief.',
        },
      ],
    }

    setZoSessions((currentSessions) => [
      researchSession,
      ...currentSessions.filter((session) => session.taskId !== task.id),
    ].slice(0, 8))

    setLog((items) => [`[ZOO] ${task.label} routed to Zoo Computer. Research intake started.`, ...items].slice(0, 7))

    try {
      const response = await fetch('/api/zo-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: {
            id: task.id,
            label: task.label,
            type: 'research',
            difficulty: task.difficulty,
            reward: task.reward,
          },
          agent: {
            id: researcher.id,
            name: researcher.name,
            title: researcher.title,
          },
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error ?? 'Zoo Computer research intake failed.')
      }

      const output = data?.output ?? 'Research intake completed.'
      const summary = makeZoSummary(output)

      setZoSessions((currentSessions) =>
        currentSessions.map((session) =>
          session.taskId === task.id
            ? {
                ...session,
                status: 'done',
                output,
                summary,
                insights: makeZoInsights(task, researcher, output),
                actions: extractZoActions(output, roleResultCards.research.sections),
                confidence: data?.confidence ?? Math.min(98, Math.max(68, researcher.accuracy + 4)),
                conversationId: data?.conversationId ?? null,
                messages: [
                  ...(session.messages ?? []).filter((message) => !(message.role === 'system' && message.body === 'Research intake started for this brief.')),
                  {
                    id: `assistant-${task.id}-${Date.now()}`,
                    role: 'assistant',
                    title: 'Research brief',
                    body: output,
                  },
                ],
              }
            : session,
        ),
      )
      setTasks((currentTasks) =>
        currentTasks.map((item) =>
          item.id === task.id
            ? {
                ...item,
                note: `Research brief ready: ${summary}`,
              }
            : item,
        ),
      )
      setLog((items) => [`[ZOO] Research intake completed for ${task.label}: ${summary}`, ...items].slice(0, 7))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected research intake error.'
      setZoSessions((currentSessions) =>
        currentSessions.map((session) =>
          session.taskId === task.id
            ? {
                ...session,
                status: 'failed',
                output: message,
                summary: 'Research intake did not complete.',
                insights: [
                  { label: 'Stage', value: 'Research intake' },
                  { label: 'Status', value: 'Needs retry' },
                  { label: 'Agent', value: researcher.name },
                ],
                actions: ['Check API/protection settings', 'Retry research intake', 'Continue with manual dispatch'],
              }
            : session,
        ),
      )
      setLog((items) => [`[ERROR] Research intake failed for ${task.label}: ${message}`, ...items].slice(0, 7))
    }
  }

  function spawnTask() {
    const task = createTask(nextTaskId, {
      label: requestTitle.trim() || undefined,
      type: requestType,
      priority: requestPriority,
      source: 'chat',
      note: 'Short brief, clear handoff, confirm before live execution.',
    })
    setTasks((currentTasks) => [task, ...currentTasks])
    setNextTaskId((id) => id + 1)
    setSelectedTask(task.id)
    void sendTaskToResearch(task)
    setRequestTitle('')
    setRequestPriority('normal')
    setIsComposerOpen(false)
  }

  function deleteTask(taskId: number) {
    const task = tasks.find((item) => item.id === taskId)
    if (!task) return

    const remainingTasks = tasks.filter((item) => item.id !== taskId)
    const remainingZoSessions = zoSessions.filter((session) => session.taskId !== taskId)

    setTasks(remainingTasks)
    setZoSessions(remainingZoSessions)

    if (selectedTask === taskId) {
      const nextSelected = remainingTasks.find((item) => item.state === 'queued') ?? remainingTasks[0] ?? null
      setSelectedTask(nextSelected?.id ?? null)
    }

    if (selectedZoTaskId === taskId) {
      setSelectedZoTaskId(remainingZoSessions[0]?.taskId ?? null)
    }

    setLog((items) => [`[TASK] ${task.label} was deleted from the workspace.`, ...items].slice(0, 7))
  }

  function startZooChatTask() {
    const prompt = zooChatPrompt.trim()
    if (!prompt || selectedZoSession?.status === 'working') return

    if (selectedZoSession?.conversationId) {
      setZoFollowUp(prompt)
      void continueZoSession(selectedZoSession, prompt)
      setZooChatPrompt('')
      return
    }

    const task = createTask(nextTaskId, {
      label: prompt,
      type: 'research',
      priority: 'normal',
      source: 'chat',
      note: 'Direct conversation from the Zoo Computer chat area.',
    })

    setTasks((currentTasks) => [task, ...currentTasks])
    setNextTaskId((id) => id + 1)
    setSelectedTask(task.id)
    setSelectedZoTaskId(task.id)
    setRequestTitle(prompt.length > 72 ? `${prompt.slice(0, 69)}...` : prompt)
    setRequestType('research')
    setRequestPriority('normal')
    void sendTaskToResearch(task)
    setZooChatPrompt('')
  }

  function resetWorkspace() {
    setTasks([])
    setNextTaskId(1)
    setSelectedTask(null)
    setSelectedZoTaskId(null)
    setZoSessions([])
    setLog([
      '[SYSTEM] Workspace reset. All tasks and sessions cleared.',
    ])
    window.localStorage.clear()
  }


  return (
    <main className="game-shell">
      <section className="hud">
        <div className="brand">
          <span className="brand-mark">AO</span>
          <div>
            <p className="eyebrow">AI office workspace</p>
            <h1>Airi Office</h1>
          </div>
        </div>

        <div className="stat-strip" aria-label="Office metrics">
          <Metric label="Total Tasks" value={tasks.length} />
          <Metric label="Active" value={tasks.filter((t) => t.state === 'active').length} />
          <Metric label="Completed" value={tasks.filter((t) => t.state === 'done').length} />
          <Metric label="Failed" value={tasks.filter((t) => t.state === 'failed').length} />
        </div>

        <button
          className="primary-button"
          onClick={() => {
            if (window.confirm('Are you sure you want to reset the workspace? This will delete all tasks and sessions.')) {
              resetWorkspace()
            }
          }}
          style={{ background: '#ef4444', color: '#ffffff' }}
        >
          Reset Workspace
        </button>
      </section>

      <div className="screen-nav" role="tablist" aria-label="Application screens">
        <button type="button" className={screen === 'dashboard' ? 'active' : ''} onClick={() => setScreen('dashboard')} role="tab" aria-selected={screen === 'dashboard'}>
          Dashboard
        </button>
        <button type="button" className={screen === 'tasks' ? 'active' : ''} onClick={() => setScreen('tasks')} role="tab" aria-selected={screen === 'tasks'}>
          Tasks
        </button>
        <button type="button" className={screen === 'chat' ? 'active' : ''} onClick={() => setScreen('chat')} role="tab" aria-selected={screen === 'chat'}>
          Chat
        </button>
        <button type="button" className={screen === 'sessions' ? 'active' : ''} onClick={() => setScreen('sessions')} role="tab" aria-selected={screen === 'sessions'}>
          Sessions
        </button>
        <button type="button" className={screen === 'documents' ? 'active' : ''} onClick={() => setScreen('documents')} role="tab" aria-selected={screen === 'documents'}>
          Files & Docs
        </button>
        <button type="button" className={screen === 'logs' ? 'active' : ''} onClick={() => setScreen('logs')} role="tab" aria-selected={screen === 'logs'}>
          System log
        </button>
      </div>

      {screen === 'dashboard' ? (
      <section className="workspace">
        <aside className="panel task-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Reception</p>
              <h2>Intake Tasks</h2>
            </div>
            <button className="add-task-btn" onClick={() => setIsComposerOpen(true)}>
              + Create Task
            </button>
          </div>

          <div className="task-list">
            {queuedTasks.length ? (
              queuedTasks.map((task) => (
                <button
                  className={selectedTask === task.id ? 'task-card selected' : 'task-card'}
                  key={task.id}
                  onClick={() => setSelectedTask(task.id)}
                >
                  <div className="task-card-head">
                    <span className={`task-type ${task.type}`}>{taskLabels[task.type]}</span>
                    <span className={`task-pill ${task.priority}`}>{taskPriorityLabels[task.priority]}</span>
                  </div>
                  <strong>{task.label}</strong>
                  <small>{task.note}</small>
                  <div className="task-meta">
                    <span>{taskSourceLabels[task.source]}</span>
                    <span>Difficulty {task.difficulty}</span>
                    <span>Reward {task.reward}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="empty-state">
                <strong>No requests yet</strong>
                <small>Create one in Reception to start the shift.</small>
              </div>
            )}
          </div>

          <div className="assignment-box">
            <div className="assignment-box-head">
              <p className="eyebrow">Dispatch</p>
              <button
                type="button"
                className="danger-button"
                disabled={!selected}
                onClick={() => {
                  if (!selected) return
                  const confirmed = window.confirm(`Delete task "${selected.label}"? This will also remove its Zoo session.`)
                  if (!confirmed) return
                  deleteTask(selected.id)
                }}
              >
                Delete task
              </button>
            </div>
            <strong>{selected ? selected.label : 'Select a researched request'}</strong>
            <p className="queue-hint">
              New briefs now research first through Zoo Computer, then you can dispatch the task to the right agent.
            </p>
            <div className="assign-grid">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  disabled={!selected}
                  onClick={() => assignTask(agent.id)}
                  style={{ '--agent-color': agent.color } as React.CSSProperties}
                >
                  {agent.title}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="office">
          <div className="room-grid" />



          <svg className="movement-routes" aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none">
            {activeTasks.map((task) => {
              const agent = agents.find((item) => item.id === task.assignedTo)
              if (!agent) return null
              const position = getAgentPosition(agent, task)

              return (
                <polyline
                  key={task.id}
                  points={position.route.map((point) => `${point.x},${point.y}`).join(' ')}
                  style={{ '--agent-color': agent.color } as React.CSSProperties}
                />
              )
            })}
          </svg>
          {activeTasks.map((task) => {
            const agent = agents.find((item) => item.id === task.assignedTo)
            if (!agent) return null
            const position = getAgentPosition(agent, task)
            if (!position.walking) return null

            return (
              <span
                aria-hidden="true"
                className="arrival-marker"
                key={`arrival-${task.id}`}
                style={
                  {
                    left: `${position.targetX}%`,
                    top: `${position.targetY}%`,
                    '--agent-color': agent.color,
                  } as React.CSSProperties
                }
              />
            )
          })}
          {furniture.map((item) => {
            const lowerLabel = item.label.toLowerCase()
            let targetScreen: 'tasks' | 'chat' | 'documents' | 'logs' | null = null
            if (
              lowerLabel.includes('shelf') || lowerLabel.includes('bookshelf') ||
              lowerLabel.includes('cabinet') || lowerLabel.includes('index') ||
              lowerLabel.includes('drawer') || lowerLabel.includes('document') ||
              lowerLabel.includes('reference') || lowerLabel.includes('research chair')
            ) {
              targetScreen = 'documents'
            } else if (
              lowerLabel.includes('couch') || lowerLabel.includes('coffee table') ||
              lowerLabel.includes('planning board')
            ) {
              targetScreen = 'tasks'
            } else if (
              lowerLabel.includes('zoo left screen') || lowerLabel.includes('zoo center screen') ||
              lowerLabel.includes('zoo right screen') || lowerLabel.includes('zoo command') ||
              lowerLabel.includes('zoo primary terminal') || lowerLabel.includes('zoo node') ||
              lowerLabel.includes('zoo operator chair') ||
              lowerLabel.includes('zoo chat') || lowerLabel.includes('chat display') ||
              lowerLabel.includes('chat terminal') || lowerLabel.includes('chat desk') ||
              lowerLabel.includes('chat node') || lowerLabel.includes('chat operator')
            ) {
              targetScreen = 'chat'
            } else if (
              lowerLabel.includes('log overview') || lowerLabel.includes('ops control') ||
              lowerLabel.includes('ops left') || lowerLabel.includes('ops right') ||
              lowerLabel.includes('log server')
            ) {
              targetScreen = 'logs'
            }

            return (
              <FurnitureItem
                key={`${item.src}-${item.x}-${item.y}`}
                item={item}
                onClick={targetScreen ? () => setScreen(targetScreen) : undefined}
              />
            )
          })}
          {Object.entries(stationPositions).map(([id, station]) => (
            <div
              className={`station ${id}`}
              key={id}
              style={{ left: `${station.x}%`, top: `${station.y}%` }}
            >
              <span>{station.label}</span>
            </div>
          ))}

          {/* === VERSION 4: ROOM PANELS === */}

          {/* Files & Docs Room */}
          <button type="button" className="office-room room-docs" onClick={() => setScreen('documents')}>
            <span className="office-room-header">Files &amp; Docs</span>
            <span className="office-room-info">
              <strong>Files &amp; Docs</strong>
              <small>Browse files, research briefs, saved notes, and reference materials from Zoo Computer.</small>
              <em>Open Files &amp; Docs screen</em>
            </span>
          </button>

          {/* Zoo Computer Room */}
          <button type="button" className="office-room room-zoo" onClick={() => { setSelectedZoTaskId(visibleZoSessions[0]?.taskId ?? null); setScreen('chat') }}>
            <span className="office-room-header">Zoo Computer</span>
            <span className="office-room-info">
              <strong>Zoo Computer</strong>
              <small>Connect directly to Zoo Computer and talk through research in a dedicated chat workspace.</small>
              <em>Open Chat screen</em>
            </span>
          </button>

          {/* Log Station Room */}
          <button type="button" className="office-room room-logs" onClick={() => setScreen('logs')}>
            <span className="office-room-header">Log Station</span>
            <span className="office-room-info">
              <strong>Log Station</strong>
              <small>Monitor recent events, dispatch history, and system-level office activity.</small>
              <em>Open System log</em>
            </span>
          </button>

          {/* Meeting Area Room */}
          <button type="button" className="office-room room-meeting" onClick={() => setScreen('tasks')}>
            <span className="office-room-header">Meeting Area</span>
            <span className="office-room-info">
              <strong>Meeting &amp; planning</strong>
              <small>Discuss tasks, review queue, and organize the next work pass.</small>
              <em>Open Tasks screen</em>
            </span>
          </button>

          {/* ZOO CORE Corridor */}
          <div className="office-room room-core">
            <span className="office-room-header">ZOO CORE</span>
            <svg className="zoo-core-cube" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 4 L38 13 L38 31 L22 40 L6 31 L6 13 Z" fill="rgba(0,240,255,0.08)" stroke="#00f0ff" strokeWidth="1.5"/>
              <path d="M22 4 L22 40" stroke="#00f0ff" strokeWidth="0.8" opacity="0.4"/>
              <path d="M6 13 L38 13" stroke="#00f0ff" strokeWidth="0.8" opacity="0.4"/>
              <circle cx="22" cy="22" r="5" fill="#00f0ff" opacity="0.9"/>
            </svg>
            <div className="zoo-core-stair">
              <span /><span /><span /><span />
            </div>
          </div>

          {/* Zoo Chat Room */}
          <button
            type="button"
            className="office-room room-chat"
            onClick={() => {
              setSelectedZoTaskId(visibleZoSessions[0]?.taskId ?? null)
              setScreen('chat')
            }}
          >
            <span className="office-room-header">Zoo Chat</span>
            <span className="office-room-info">
              <strong>Talk to Zoo directly</strong>
              <small>Open a direct conversation workspace for Zoo Computer with a dedicated chat tab.</small>
              <em>Open Chat · Zoo computer</em>
            </span>
          </button>

          {/* Pet Zone Room */}
          <div className="office-room room-pets">
            <span className="office-room-header">Pet Zone</span>
            <span className="office-room-info">
              <strong>Pet Zone</strong>
              <small>Tata's resting area and mascot play zone. Safe space for local pets.</small>
              <em>Relaxation Area</em>
            </span>
          </div>

          {dashboardMascots.map((mascot) => {
            const loopRoute = [...mascot.route, mascot.route[0]]
            const loopPercent = ((Date.now() / 22000) + mascotTick * 0.002) % 1
            const current = interpolateRoute(loopRoute, loopPercent)
            const mascotRow = current.directionX >= 0 ? 1 : 2

            return (
              <div
                key={mascot.id}
                className="dashboard-mascot clickable"
                style={{ left: `${current.x}%`, top: `${current.y}%`, cursor: 'pointer' } as React.CSSProperties}
                onClick={() => handleMascotClick(mascot.id)}
              >
                {mascotBubble[mascot.id] && (
                  <div className="mascot-speech-bubble">mew mew</div>
                )}
                <div
                  aria-label={mascot.petCredit}
                  className="dashboard-mascot-sprite"
                  role="img"
                  style={{ '--pet-url': `url(${mascot.pet})`, '--pet-row': mascotRow } as React.CSSProperties}
                />
                <small>{mascot.name}</small>
              </div>
            )
          })}

          {agents.map((agent, index) => {
            const assigned = activeTasks.find((task) => task.assignedTo === agent.id)
            const progress = assigned
              ? Math.round(Math.min(100, (assigned.progress / assigned.difficulty) * 100))
              : 0
            const position = getAgentPosition(agent, assigned)
            const isInspected = inspectedAgent?.agentId === agent.id
            const inspectKey = `${agent.id}-${inspectedAgent?.tick ?? 0}`

            return (
              <div
                className={[
                  'agent',
                  assigned ? 'busy' : '',
                  position.walking ? 'walking' : '',
                  isInspected ? 'inspected' : '',
                ].filter(Boolean).join(' ')}
                key={agent.id}
                role="button"
                tabIndex={0}
                onClick={() => inspectAgent(agent)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    inspectAgent(agent)
                  }
                }}
                style={
                  {
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                    '--agent-color': agent.color,
                    '--pet-row': position.animationRow,
                    '--step-delay': `${index * 90}ms`,
                  } as React.CSSProperties
                }
              >
                {isInspected ? (
                  <span className="agent-burst" key={`burst-${inspectKey}`} aria-hidden="true" />
                ) : null}
                <div
                  aria-label={agent.petCredit}
                  className="pet-sprite"
                  role="img"
                  style={{ '--pet-url': `url(${agent.pet})` } as React.CSSProperties}
                />
                <strong>{agent.name}</strong>
                <small>
                  {assigned ? `${position.phase} ${progress}% ${taskLabels[assigned.type]}` : position.phase}
                </small>
                {assigned ? <span className={`task-pill ${assigned.priority}`}>{taskPriorityLabels[assigned.priority]}</span> : null}
                {isInspected ? (
                  <div className="agent-popover" key={`popover-${inspectKey}`}>
                    <span>{agent.title}</span>
                    <strong>{assigned ? `${progress}% ${taskLabels[assigned.type]}` : 'Ready'}</strong>
                  </div>
                ) : null}
              </div>
            )
          })}

          {activeTasks.map((task) => {
            const agent = agents.find((item) => item.id === task.assignedTo)
            if (!agent) return null
            const station = stationPositions[agent.station]
            const progress = Math.round(Math.min(100, (task.progress / task.difficulty) * 100))

            return (
              <div
                className="work-bubble"
                key={task.id}
                style={{ left: `calc(${station.x}% + 58px)`, top: `calc(${station.y}% - 44px)` }}
              >
                <span className={`task-type ${task.type}`}>{taskLabels[task.type]}</span>
                <strong>{task.label}</strong>
                <div className="progress">
                  <span style={{ width: `${progress}%` }} />
                </div>
              </div>
            )
          })}
        </section>

      </section>
      ) : null}

      {screen === 'tasks' ? (
        <section className="panel app-screen-panel">
          <div className="panel-head compact">
            <div>
              <p className="eyebrow">Task center</p>
              <h2>Tasks</h2>
            </div>
            <span className="load-pill">{queuedTasks.length} queued</span>
          </div>

          <div className="tasks-screen-grid">
            <section className="menu-card task-composer-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
              <div className="panel-head compact" style={{ marginBottom: '16px' }}>
                <div style={{ textAlign: 'center', margin: '0 auto' }}>
                  <p className="eyebrow" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: '#ff7aa8' }}>Task Intake</p>
                  <h3 style={{ margin: '8px 0 0 0', fontSize: '1.25rem', color: '#fff' }}>Ready to dispatch new work?</h3>
                </div>
              </div>
              <button type="button" className="add-task-btn" onClick={() => setIsComposerOpen(true)}>
                + Create Task
              </button>
            </section>

            <section className="menu-card">
              <div className="panel-head compact">
                <div>
                  <p className="eyebrow">Queue</p>
                  <h3>Queued tasks</h3>
                </div>
              </div>
              <div className="task-list menu-task-list">
                {queuedTasks.length ? (
                  queuedTasks.map((task) => (
                    <button
                      className={selectedTask === task.id ? 'task-card selected' : 'task-card'}
                      key={`menu-queued-${task.id}`}
                      onClick={() => setSelectedTask(task.id)}
                    >
                      <div className="task-card-head">
                        <span className={`task-type ${task.type}`}>{taskLabels[task.type]}</span>
                        <span className={`task-pill ${task.priority}`}>{taskPriorityLabels[task.priority]}</span>
                      </div>
                      <strong>{task.label}</strong>
                      <small>{task.note}</small>
                      <div className="task-meta">
                        <span>{taskSourceLabels[task.source]}</span>
                        <span>Difficulty {task.difficulty}</span>
                        <span>Reward {task.reward}</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="empty-state">
                    <strong>No queued tasks</strong>
                    <small>Create a new request right here in the Tasks tab.</small>
                  </div>
                )}
              </div>
            </section>

            <section className="menu-card">
              <div className="panel-head compact">
                <div>
                  <p className="eyebrow">Live work</p>
                  <h3>Agent sessions</h3>
                </div>
                <span className="load-pill">{activeTasks.length} active</span>
              </div>
              <div className="agent-list compact-agent-list">
                {dashboardMascots.map((mascot) => (
            <div
              key={mascot.id}
              className="dashboard-mascot roaming"
              style={
                {
                  '--start-x': `${mascot.route[0].x}%`,
                  '--start-y': `${mascot.route[0].y}%`,
                  '--x1': `${mascot.route[1].x}%`,
                  '--y1': `${mascot.route[1].y}%`,
                  '--x2': `${mascot.route[2].x}%`,
                  '--y2': `${mascot.route[2].y}%`,
                  '--x3': `${mascot.route[3].x}%`,
                  '--y3': `${mascot.route[3].y}%`,
                  '--x4': `${mascot.route[4].x}%`,
                  '--y4': `${mascot.route[4].y}%`,
                } as React.CSSProperties
              }
            >
              <div
                aria-label={mascot.petCredit}
                className="dashboard-mascot-sprite"
                role="img"
                style={{ '--pet-url': `url(${mascot.pet})` } as React.CSSProperties}
              />
              <small>{mascot.name}</small>
            </div>
          ))}

          {agents.map((agent) => {
                  const assigned = activeTasks.find((task) => task.assignedTo === agent.id)
                  const progress = assigned ? Math.round(Math.min(100, (assigned.progress / assigned.difficulty) * 100)) : 0
                  const statusLabel = assigned ? (progress >= 100 ? 'Wrapping up' : 'Working') : 'Idle'

                  return (
                    <article
                      className={selectedAgentId === agent.id ? 'agent-card selected' : 'agent-card'}
                      key={agent.id}
                      onClick={() => setSelectedAgentId(agent.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setSelectedAgentId(agent.id)
                        }
                      }}
                      style={{ '--agent-color': agent.color } as React.CSSProperties}
                    >
                      <div className="agent-card-head">
                        <span aria-hidden="true" className="mini-sprite" style={{ '--pet-url': `url(${agent.pet})` } as React.CSSProperties} />
                        <div>
                          <strong>{agent.name}</strong>
                          <small>{agent.title}</small>
                        </div>
                        <span className={`agent-state ${assigned ? 'busy' : 'idle'}`}>{statusLabel}</span>
                      </div>

                      <div className="agent-task-line">
                        <span>Current task</span>
                        <strong>{assigned ? taskLabels[assigned.type] : 'No active task'}</strong>
                        <small>{assigned ? assigned.label : 'Waiting for reception.'}</small>
                      </div>

                      {assigned ? (
                        <div className="agent-progress">
                          <div className="progress"><span style={{ width: `${progress}%` }} /></div>
                          <small>{progress}% complete</small>
                        </div>
                      ) : selected ? (
                        <button
                          type="button"
                          className="assign-button"
                          onClick={(e) => {
                            e.stopPropagation()
                            assignTask(agent.id)
                          }}
                          style={{ marginTop: '10px', height: '34px', width: '100%' }}
                        >
                          Assign selected task
                        </button>
                      ) : null}
                    </article>
                  )
                })}
              </div>
            </section>
          </div>
        </section>
      ) : null}

      {screen === 'chat' ? (
        <section className="chat-screen-panel">
          <div className="chat-screen-layout">
            <aside className="chat-history-panel">
              <div className="chat-history-head">
                <div>
                  <p className="eyebrow">Zoo workspace</p>
                  <h2>Chat</h2>
                </div>
                <span className="chat-history-count">{visibleZoSessions.length}</span>
              </div>

              <button
                type="button"
                className="chat-history-new"
                onClick={() => {
                  setSelectedZoTaskId(null)
                  setZooChatPrompt('')
                }}
              >
                New chat
              </button>

              <div className="chat-history-list">
                {visibleZoSessions.length ? (
                  visibleZoSessions.map((session) => {
                    const agent = agents.find((item) => item.id === session.agentId)
                    return (
                      <button
                        className={selectedZoSession?.taskId === session.taskId ? 'chat-history-item selected' : 'chat-history-item'}
                        key={`chat-select-${session.taskId}`}
                        onClick={() => setSelectedZoTaskId(session.taskId)}
                        style={{ '--agent-color': agent?.color ?? '#79e7c5' } as React.CSSProperties}
                      >
                        <strong>{session.taskLabel}</strong>
                        <small>{agent?.name ?? 'Agent'} · {zoStatusLabels[session.status]}</small>
                        <small>{session.conversationId ? `Session ${session.conversationId}` : 'New Zoo session'}</small>
                      </button>
                    )
                  })
                ) : (
                  <div className="chat-history-empty">
                    <strong>No chats yet</strong>
                    <small>Start a new conversation with Zoo Computer.</small>
                  </div>
                )}
              </div>
            </aside>

            <section className="chat-conversation-panel">
              <div className="chat-conversation-head">
                <div className="chat-conversation-title">
                  <div>
                    <h2>{selectedZoSession?.taskLabel ?? 'New chat'}</h2>
                    <small>{selectedZoSession?.conversationId ? `Session ${selectedZoSession.conversationId}` : 'Direct conversation with Zoo Computer'}</small>
                  </div>
                </div>
                <div className="chat-conversation-actions">
                  <span className={`chat-status-pill ${chatSignal === 'working' ? 'working' : ''} ${chatSignal === 'received' ? 'received' : ''}`}>
                    {chatSignal === 'working'
                      ? 'Zoo is replying...'
                      : chatSignal === 'received'
                        ? 'New response'
                        : (selectedZoSession ? zoStatusLabels[selectedZoSession.status] : 'Ready')}
                  </span>
                  <button type="button" className="chat-link-button" onClick={() => setScreen('sessions')}>
                    Open full session
                  </button>
                </div>
              </div>

              <div className="chat-thread-shell">
                {chatSignal !== 'idle' ? (
                  <div className={`chat-activity-banner ${chatSignal}`}>
                    <span className="chat-activity-dot" />
                    <strong>{chatSignal === 'working' ? 'Zoo đang phản hồi...' : 'Zoo vừa gửi phản hồi mới'}</strong>
                  </div>
                ) : null}
                <div ref={chatThreadRef} className="zo-thread zoo-chat-thread chatgpt-thread">
                  {selectedZoSession?.messages?.length ? (
                    selectedZoSession.messages.map((message, index, items) => {
                      const isLatestAssistant =
                        message.role === 'assistant' &&
                        index === items.map((item) => item.role).lastIndexOf('assistant')

                      return (
                      <article
                        key={`chat-screen-${message.id}`}
                        className={`zo-thread-message chatgpt-message ${message.role} ${chatSignal === 'received' && isLatestAssistant ? 'fresh' : ''}`}
                      >
                        <div className="chatgpt-message-meta">
                          <strong>{message.role === 'assistant' ? 'Zoo Computer' : message.role === 'user' ? 'You' : 'System'}</strong>
                          {message.title ? <small>{message.title}</small> : null}
                        </div>
                        <p>{message.body}</p>
                      </article>
                    )})
                  ) : (
                    <div className="zoo-chat-empty chatgpt-empty">
                      <strong>How can Zoo Computer help?</strong>
                      <small>Ask a question, request research, or continue an active thread here.</small>
                    </div>
                  )}
                </div>
              </div>

              <div className="chat-composer-shell">
                <div className="chat-quick-actions">
                  <button type="button" onClick={() => setZooChatPrompt('Summarize the current situation and the most important findings.')}>Summarize</button>
                  <button type="button" onClick={() => setZooChatPrompt('Continue the research with next steps, risks, and unanswered questions.')}>Next steps</button>
                  <button type="button" onClick={() => setZooChatPrompt('List the main risks, blockers, and assumptions here.')}>Risks</button>
                </div>

                <form
                  className="zoo-chat-input chatgpt-composer"
                  onSubmit={(event) => {
                    event.preventDefault()
                    startZooChatTask()
                  }}
                >
                  <textarea
                    value={zooChatPrompt}
                    onChange={(event) => setZooChatPrompt(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        startZooChatTask()
                      }
                    }}
                    placeholder={selectedZoSession?.conversationId ? 'Message Zoo Computer...' : 'Ask Zoo Computer anything...'}
                  />
                  <div className="zoo-chat-actions chatgpt-composer-actions">
                    <button type="submit" className="intake-submit" disabled={selectedZoSession?.status === 'working'}>
                      {selectedZoSession?.status === 'working' ? 'Sending...' : (selectedZoSession?.conversationId ? 'Send' : 'Start chat')}
                    </button>
                  </div>
                </form>
              </div>
            </section>
          </div>
        </section>
      ) : null}

      {screen === 'sessions' ? (
        <section className="panel app-screen-panel">
          <div className="panel-head compact">
            <div>
              <p className="eyebrow">Zo handoff</p>
              <h2>Sessions</h2>
            </div>
            <span className={activeZoSession ? `zo-status ${activeZoSession.status}` : 'zo-status'}>
              {activeZoSession ? zoStatusLabels[activeZoSession.status] : 'Ready'}
            </span>
          </div>

          {visibleZoSessions.length ? (
            <div className="workspace-menu-grid sessions-grid">
              <section className="menu-card">
                <div className="zo-session-list">
                  {visibleZoSessions.map((session) => {
                    const agent = agents.find((item) => item.id === session.agentId)
                    const latestOutput = getLatestZoAssistantOutput(session)
                    return (
                      <button
                        className={activeZoSession?.taskId === session.taskId ? 'selected' : ''}
                        key={session.taskId}
                        onClick={() => setSelectedZoTaskId(session.taskId)}
                        style={{ '--agent-color': agent?.color ?? '#79e7c5' } as React.CSSProperties}
                      >
                        <span className={`task-type ${session.taskType}`}>{taskLabels[session.taskType]}</span>
                        <strong>{session.taskLabel}</strong>
                        <small>{agent?.name ?? 'Agent'} · {zoStatusLabels[session.status]}</small>
                        <p className="zo-session-preview">{makeZoSummary(latestOutput)}</p>
                      </button>
                    )
                  })}
                </div>
              </section>

              {activeZoSession ? (
                <section className="menu-card">
                  <div className="zo-result-card menu-zo-result">
                    <div className="zo-session-banner">
                      <div>
                        <p className="eyebrow">Zoo Computer session</p>
                        <strong>{activeZoSession.conversationId ? `Session ${activeZoSession.conversationId}` : 'Pending session link'}</strong>
                        <small>{activeZoSession.status === 'done' ? 'Research finished. You can continue this same session.' : 'This session is still active in the research flow.'}</small>
                      </div>
                      <button
                        type="button"
                        className="zo-continue-button"
                        disabled={!activeZoSession.conversationId || !zoFollowUp.trim() || activeZoSession.status === 'working'}
                        onClick={() => void continueZoSession(activeZoSession)}
                      >
                        {activeZoSession.status === 'working' ? 'Continuing...' : 'Continue session'}
                      </button>
                    </div>

                    {activeZoSession.messages?.length ? (
                      <div className="zo-thread">
                        {activeZoSession.messages.map((message) => (
                          <article key={message.id} className={`zo-thread-message ${message.role}`}>
                            <small>{message.role === 'user' ? 'You' : message.role === 'assistant' ? 'Zoo Computer' : 'System'}</small>
                            {message.title ? <strong>{message.title}</strong> : null}
                            <p>{message.body}</p>
                          </article>
                        ))}
                      </div>
                    ) : null}

                    <div className="zo-result-head">
                      <span className={`task-type ${activeZoSession.taskType}`}>{roleResultCards[activeZoSession.taskType].summaryLabel}</span>
                      {activeZoSession.confidence ? <strong>{activeZoSession.confidence}% confidence</strong> : null}
                    </div>

                    <div className="zo-primary-output">
                      <span className="eyebrow">Latest Zoo output</span>
                      <p className="zo-summary">{getLatestZoAssistantOutput(activeZoSession)}</p>
                    </div>

                    {activeZoSession.insights?.length ? (
                      <div className="zo-insights">
                        {activeZoSession.insights.map((insight) => (
                          <div key={`${insight.label}-${insight.value}`}>
                            <span>{insight.label}</span>
                            <strong>{insight.value}</strong>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div className="zo-follow-up-box">
                      <label className="intake-field">
                        <span>Follow-up for this session</span>
                        <input
                          value={zoFollowUp}
                          onChange={(event) => setZoFollowUp(event.target.value)}
                          placeholder="Ask Zoo Computer to expand, clarify, or continue this same session"
                        />
                      </label>
                    </div>

                    {activeZoSession.actions?.length ? (
                      <div className="zo-actions">
                        <span>Continue from this session</span>
                        <ol>
                          {activeZoSession.actions.map((action, index) => (
                            <li key={`${action}-${index}`}>{action}</li>
                          ))}
                        </ol>
                      </div>
                    ) : null}

                    {activeZoSession.status === 'pending' ? (
                      <div className="zo-confirm-actions">
                        <button onClick={() => confirmZoTask(activeZoSession)}>Yes, send to Zo</button>
                        <button onClick={() => cancelZoTask(activeZoSession)}>No, keep local</button>
                      </div>
                    ) : null}

                    <details className="zo-output">
                      <summary>Full session output</summary>
                      <p>{activeZoSession.output}</p>
                      {activeZoSession.conversationId ? <small>Conversation {activeZoSession.conversationId}</small> : null}
                    </details>
                  </div>
                </section>
              ) : null}
            </div>
          ) : (
            <section className="panel app-screen-panel empty-screen-panel">
              <p className="zo-empty">Assign a task from Dashboard to send real work through Zo.</p>
            </section>
          )}
        </section>
      ) : null}

      {screen === 'documents' ? (
        <section className="panel app-screen-panel">
          <div className="panel-head compact">
            <div>
              <p className="eyebrow">Files and references</p>
              <h2>Files & Docs</h2>
            </div>
            <span className="load-pill">{queuedTasks.length + zoSessions.length} items</span>
          </div>

          <div className="workspace-menu-grid">
            <section className="menu-card">
              <div className="panel-head compact">
                <div>
                  <p className="eyebrow">Brief archive</p>
                  <h3>Task documents</h3>
                </div>
              </div>
              <div className="task-list menu-task-list">
                {tasks.slice(0, 8).map((task) => (
                  <article key={`doc-${task.id}`} className="task-card selected">
                    <div className="task-card-head">
                      <span className={`task-type ${task.type}`}>{taskLabels[task.type]}</span>
                      <span className={`task-pill ${task.priority}`}>{taskPriorityLabels[task.priority]}</span>
                    </div>
                    <strong>{task.label}</strong>
                    <small>{task.note}</small>
                    <div className="task-meta">
                      <span>{taskSourceLabels[task.source]}</span>
                      <span>Difficulty {task.difficulty}</span>
                      <span>Reward {task.reward}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="menu-card">
              <div className="panel-head compact">
                <div>
                  <p className="eyebrow">Research notes</p>
                  <h3>Zoo Computer outputs</h3>
                </div>
              </div>
              <div className="zo-thread">
                {zoSessions.length ? (
                  zoSessions.flatMap((session) =>
                    (session.messages ?? []).slice(-3).map((message) => (
                      <article key={`${session.taskId}-${message.id}`} className={`zo-thread-message ${message.role}`}>
                        <small>{session.taskLabel}</small>
                        {message.title ? <strong>{message.title}</strong> : null}
                        <p>{message.body}</p>
                      </article>
                    )),
                  )
                ) : (
                  <p className="zo-empty">Research outputs will collect here after Zoo Computer sessions start.</p>
                )}
              </div>
            </section>
          </div>
        </section>
      ) : null}

      {screen === 'logs' ? (
        <section className="panel app-screen-panel">
          <div className="panel-head compact">
            <div>
              <p className="eyebrow">System events</p>
              <h2>Operations log</h2>
            </div>
            <span className="load-pill">{log.length} events</span>
          </div>

          <div className="log-box log-box-compact menu-log-box operations-log-box">
            <p className="eyebrow">System actions, Zoo responses, and processing history</p>
            {log.map((item, index) => {
              const tone = item.startsWith('[ERROR]')
                ? 'error'
                : item.startsWith('[ZOO]')
                  ? 'zoo'
                  : item.startsWith('[TASK]')
                    ? 'task'
                    : 'system'

              return (
                <article key={`${item}-${index}`} className={`log-entry ${tone}`}>
                  <span className="log-entry-tag">{tone}</span>
                  <p>{item.replace(/^\[(ERROR|ZOO|TASK|SYSTEM)\]\s*/, '')}</p>
                </article>
              )
            })}
          </div>
        </section>
      ) : null}

      <TaskModal
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        onSubmit={(e) => {
          e.preventDefault()
          spawnTask()
        }}
        requestTitle={requestTitle}
        setRequestTitle={setRequestTitle}
        requestType={requestType}
        setRequestType={setRequestType}
        requestPriority={requestPriority}
        setRequestPriority={setRequestPriority}
        taskLabels={taskLabels}
        taskPriorityLabels={taskPriorityLabels}
      />
    </main>
  )
}
function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export default App


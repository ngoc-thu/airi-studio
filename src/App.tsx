import { useEffect, useMemo, useState } from 'react'
import './App.css'

type AgentRole = 'research' | 'plan' | 'code' | 'review'
type StationId = 'inbox' | 'library' | 'planning' | 'terminal' | 'review'
type TaskType = AgentRole
type TaskState = 'queued' | 'active' | 'done' | 'failed'

type TaskPriority = 'low' | 'normal' | 'high'

type TaskSource = 'chat' | 'meeting' | 'system'

type Agent = {
  id: AgentRole
  name: string
  title: string
  station: StationId
  speed: number
  accuracy: number
  focus: number
  color: string
  pet: string
  petCredit: string
}

type Task = {
  id: number
  label: string
  type: TaskType
  priority: TaskPriority
  source: TaskSource
  note: string
  difficulty: number
  reward: number
  state: TaskState
  assignedTo?: AgentRole
  progress: number
}

type Metrics = {
  day: number
  done: number
  failed: number
  tokens: number
  happiness: number
  credits: number
}

type Point = {
  x: number
  y: number
}

type AgentInspect = {
  agentId: AgentRole
  tick: number
}

type ZoSessionStatus = 'pending' | 'sending' | 'working' | 'done' | 'failed'

type ZoInsight = {
  label: string
  value: string
}

type ZoSession = {
  taskId: number
  taskLabel: string
  taskType: TaskType
  agentId: AgentRole
  status: ZoSessionStatus
  output: string
  summary?: string
  insights?: ZoInsight[]
  actions?: string[]
  confidence?: number
  conversationId?: string | null
}

const stationPositions: Record<StationId, { x: number; y: number; label: string }> = {
  inbox: { x: 12, y: 76, label: 'Inbox' },
  library: { x: 21, y: 25, label: 'Research Zone' },
  planning: { x: 39, y: 70, label: 'Plan Zone' },
  terminal: { x: 55, y: 62, label: 'Code Zone' },
  review: { x: 79, y: 38, label: 'Review Zone' },
}

const furniture = [
  { src: '/furniture/table-orange.png', x: 20, y: 28, w: 92, label: 'Research command desk' },
  { src: '/furniture/monitor-desk.png', x: 17, y: 25, w: 72, label: 'Research left monitor' },
  { src: '/furniture/monitor-desk.png', x: 23, y: 25, w: 72, label: 'Research right monitor' },
  { src: '/furniture/board-wide.png', x: 17, y: 14, w: 82, label: 'Research planning board' },
  { src: '/furniture/bookshelf.png', x: 30, y: 18, w: 48, label: 'Research books' },
  { src: '/furniture/bookshelf-tall.png', x: 6, y: 80, w: 44, label: 'Lounge shelf' },
  { src: '/furniture/couch-blue.png', x: 16, y: 79, w: 86, label: 'Lounge couch' },
  { src: '/furniture/table-orange.png', x: 23, y: 84, w: 42, label: 'Lounge coffee table' },
  { src: '/furniture/work-desk.png', x: 53, y: 49, w: 126, label: 'Code command desk' },
  { src: '/furniture/terminal.png', x: 51, y: 45, w: 76, label: 'Code main terminal' },
  { src: '/furniture/screen-wide.png', x: 44, y: 48, w: 60, label: 'Code left screen' },
  { src: '/furniture/screen-wide.png', x: 61, y: 48, w: 60, label: 'Code right screen' },
  { src: '/furniture/server-small.png', x: 39, y: 50, w: 44, label: 'Code server stack A' },
  { src: '/furniture/server-small.png', x: 43, y: 50, w: 44, label: 'Code server stack B' },
  { src: '/furniture/chair-orange.png', x: 52, y: 58, w: 34, label: 'Code chair' },
  { src: '/furniture/green-board.png', x: 79, y: 18, w: 102, label: 'Review board' },
  { src: '/furniture/table-orange.png', x: 80, y: 32, w: 58, label: 'Review desk' },
  { src: '/furniture/cabinet.png', x: 88, y: 77, w: 70, label: 'Review rack' },
  { src: '/furniture/screen-wide.png', x: 78, y: 78, w: 50, label: 'Review status screen' },
  { src: '/furniture/server-small.png', x: 83, y: 66, w: 42, label: 'Review node' },
  { src: '/furniture/terminal.png', x: 76, y: 70, w: 36, label: 'Review terminal' },
] as const

const baseAgents: Agent[] = [
  {
    id: 'research',
    name: 'Enana',
    title: 'Researcher',
    station: 'library',
    speed: 1.05,
    accuracy: 88,
    focus: 92,
    color: '#5dd6ff',
    pet: '/pets/enana.webp',
    petCredit: 'Enana by Codex-Pets.net',
  },
  {
    id: 'plan',
    name: 'Ace Taffy',
    title: 'Planner',
    station: 'planning',
    speed: 1,
    accuracy: 86,
    focus: 84,
    color: '#ff7aa8',
    pet: '/pets/ace-taffy.webp',
    petCredit: 'Ace Taffy by CodexPets.net',
  },
  {
    id: 'code',
    name: 'Chappy',
    title: 'Coder',
    station: 'terminal',
    speed: 1.18,
    accuracy: 82,
    focus: 86,
    color: '#7cf28a',
    pet: '/pets/chappy-chan.webp',
    petCredit: 'Chappy-chan by Codex-Pets.net',
  },
  {
    id: 'review',
    name: 'Azuma',
    title: 'Reviewer',
    station: 'review',
    speed: 0.92,
    accuracy: 94,
    focus: 90,
    color: '#ffd166',
    pet: '/pets/azuma.webp',
    petCredit: 'Azuma by CodexPets.net',
  },
]

const taskTemplates: Record<TaskType, string[]> = {
  research: ['Map unknown API', 'Collect source notes', 'Compare model tradeoffs', 'Summarize user brief'],
  plan: ['Draft implementation plan', 'Break down feature steps', 'Design work sequence', 'Estimate task scope'],
  code: ['Build feature slice', 'Patch UI bug', 'Wire game state', 'Refactor task loop'],
  review: ['Catch regression', 'Audit edge cases', 'Review pull request', 'Test release path'],
}

const taskLabels: Record<TaskType, string> = {
  research: 'Research',
  plan: 'Plan',
  code: 'Code',
  review: 'Review',
}

const taskPriorityLabels: Record<TaskPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
}

const taskSourceLabels: Record<TaskSource, string> = {
  chat: 'Chat',
  meeting: 'Meeting',
  system: 'System',
}

const zoStatusLabels: Record<ZoSessionStatus, string> = {
  pending: 'Confirm',
  sending: 'Sending',
  working: 'Working',
  done: 'Done',
  failed: 'Failed',
}

const roleResultCards: Record<TaskType, { summaryLabel: string; sections: string[] }> = {
  research: {
    summaryLabel: 'Research brief',
    sections: ['Key findings', 'Constraints', 'Open questions'],
  },
  plan: {
    summaryLabel: 'Execution plan',
    sections: ['Next steps', 'Files / systems', 'Risks'],
  },
  code: {
    summaryLabel: 'Implementation notes',
    sections: ['Changes', 'Important files', 'Verification'],
  },
  review: {
    summaryLabel: 'Review verdict',
    sections: ['Issues', 'Edge cases', 'Ship / fix decision'],
  },
}

function cleanZoOutput(output: string) {
  return output.replace(/\r\n/g, '\n').trim()
}

function makeZoSummary(output: string) {
  const cleaned = cleanZoOutput(output)
  const firstLine = cleaned
    .split('\n')
    .map((line) => line.replace(/^[-*#\d.\s]+/, '').trim())
    .find(Boolean)

  if (!firstLine) return 'Zo completed the request.'
  return firstLine.length > 132 ? `${firstLine.slice(0, 129)}...` : firstLine
}

function extractZoActions(output: string, fallback: string[]) {
  const cleaned = cleanZoOutput(output)
  const bulletLines = cleaned
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^([-*•]|\d+[.)])\s+/.test(line))
    .map((line) => line.replace(/^([-*•]|\d+[.)])\s+/, '').trim())
    .filter(Boolean)

  const candidates = bulletLines.length ? bulletLines : cleaned.split(/[.!?]\s+/).map((line) => line.trim())
  const actions = candidates.filter(Boolean).slice(0, 3)

  return actions.length ? actions : fallback
}

function makeZoInsights(task: Task, agent: Agent, output: string): ZoInsight[] {
  const cleaned = cleanZoOutput(output)
  const wordCount = cleaned ? cleaned.split(/\s+/).length : 0
  const fit = agent.id === task.type ? 'Matched role' : 'Cross-role assist'

  return [
    { label: 'Role fit', value: fit },
    { label: 'Signal', value: `${wordCount} words` },
    { label: 'Source', value: 'Zo live' },
  ]
}

const agentOffsets: Record<AgentRole, { x: number; y: number }> = {
  research: { x: -1, y: 12 },
  plan: { x: -1, y: 6 },
  code: { x: 0, y: 7 },
  review: { x: 0, y: 8 },
}

const workingRows: Record<TaskType, number> = {
  research: 6,
  plan: 6,
  code: 7,
  review: 8,
}

const hallwayRoutes: Record<AgentRole, Point[]> = {
  research: [
    { x: 12, y: 76 },
    { x: 16, y: 62 },
    { x: 20, y: 48 },
  ],
  plan: [
    { x: 12, y: 76 },
    { x: 26, y: 76 },
    { x: 36, y: 76 },
  ],
  code: [
    { x: 12, y: 76 },
    { x: 34, y: 76 },
    { x: 44, y: 70 },
    { x: 55, y: 69 },
  ],
  review: [
    { x: 12, y: 76 },
    { x: 34, y: 76 },
    { x: 38, y: 66 },
    { x: 69, y: 66 },
    { x: 73, y: 45 },
    { x: 79, y: 38 },
  ],
}

function createTask(
  id: number,
  overrides: Partial<Pick<Task, 'label' | 'type' | 'priority' | 'source' | 'note'>> = {},
): Task {
  const types: TaskType[] = ['research', 'plan', 'code', 'review']
  const type = overrides.type ?? types[Math.floor(Math.random() * types.length)]
  const templates = taskTemplates[type]
  const priority = overrides.priority ?? (Math.random() > 0.72 ? 'high' : Math.random() > 0.5 ? 'normal' : 'low')
  const source = overrides.source ?? (Math.random() > 0.6 ? 'meeting' : Math.random() > 0.45 ? 'chat' : 'system')
  const note = overrides.note ?? 'Waiting for intake review.'

  return {
    id,
    label: overrides.label ?? templates[Math.floor(Math.random() * templates.length)],
    type,
    priority,
    source,
    note,
    difficulty: 45 + Math.floor(Math.random() * 46),
    reward: 8 + Math.floor(Math.random() * 10),
    state: 'queued',
    progress: 0,
  }
}

function makeInitialTasks() {
  return Array.from({ length: 8 }, (_, index) => createTask(index + 1))
}

function priorityRank(priority: TaskPriority) {
  return priority === 'high' ? 0 : priority === 'normal' ? 1 : 2
}

function getRoute(agent: Agent) {
  const offset = agentOffsets[agent.id]
  const target = stationPositions[agent.station]
  const targetPoint = { x: target.x + offset.x, y: target.y + offset.y }
  const route = hallwayRoutes[agent.id] ?? [stationPositions.inbox]

  return [...route.slice(0, -1), targetPoint]
}

function interpolateRoute(route: Point[], percent: number) {
  const segments = route.slice(1).map((point, index) => {
    const start = route[index]
    const distance = Math.hypot(point.x - start.x, point.y - start.y)
    return { start, end: point, distance }
  })
  const totalDistance = segments.reduce((total, segment) => total + segment.distance, 0)
  let remainingDistance = totalDistance * percent

  for (const segment of segments) {
    if (remainingDistance <= segment.distance) {
      const segmentPercent = segment.distance ? remainingDistance / segment.distance : 1
      return {
        x: segment.start.x + (segment.end.x - segment.start.x) * segmentPercent,
        y: segment.start.y + (segment.end.y - segment.start.y) * segmentPercent,
        directionX: segment.end.x - segment.start.x,
      }
    }

    remainingDistance -= segment.distance
  }

  const last = route.at(-1) ?? stationPositions.inbox
  return { x: last.x, y: last.y, directionX: 1 }
}

function getAgentPosition(agent: Agent, task?: Task) {
  const route = getRoute(agent)
  const target = route.at(-1) ?? stationPositions.inbox
  const targetX = target.x
  const targetY = target.y

  if (!task) {
    return {
      x: targetX,
      y: targetY,
      targetX,
      targetY,
      route,
      walking: false,
      animationRow: 0,
      phase: 'Idle',
    }
  }

  const workPercent = Math.min(1, task.progress / task.difficulty)
  const travelPercent = Math.min(1, workPercent / 0.35)
  const current = interpolateRoute(route, travelPercent)

  return {
    x: current.x,
    y: current.y,
    targetX,
    targetY,
    route,
    walking: travelPercent < 1,
    animationRow: travelPercent < 1 ? (current.directionX >= 0 ? 1 : 2) : workingRows[task.type],
    travelPercent,
    phase: travelPercent < 1 ? 'Moving' : 'Working',
  }
}

function App() {
  const [agents, setAgents] = useState(baseAgents)
  const [tasks, setTasks] = useState(makeInitialTasks)
  const [selectedTask, setSelectedTask] = useState<number | null>(1)
  const [nextTaskId, setNextTaskId] = useState(9)
  const [requestTitle, setRequestTitle] = useState('Approve the new dashboard layout')
  const [requestType, setRequestType] = useState<TaskType>('plan')
  const [requestPriority, setRequestPriority] = useState<TaskPriority>('high')
  const [requestSource, setRequestSource] = useState<TaskSource>('chat')
  const [requestNote, setRequestNote] = useState('Short brief, clear handoff, confirm before live execution.')
  const [metrics, setMetrics] = useState<Metrics>({
    day: 1,
    done: 0,
    failed: 0,
    tokens: 320,
    happiness: 72,
    credits: 18,
  })
  const [log, setLog] = useState<string[]>([
    'Shift 1 started. Route new requests to the right agent.',
    'Flow: Research -> Plan -> Code -> Review keeps the office moving cleanly.',
  ])
  const [inspectedAgent, setInspectedAgent] = useState<AgentInspect | null>(null)
  const [zoSessions, setZoSessions] = useState<ZoSession[]>([])
  const [selectedZoTaskId, setSelectedZoTaskId] = useState<number | null>(null)

  const selected = tasks.find((task) => task.id === selectedTask) ?? null
  const queuedTasks = tasks
    .filter((task) => task.state === 'queued')
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority) || b.id - a.id)
  const activeTasks = tasks.filter((task) => task.state === 'active')
  const visibleZoSessions = zoSessions.slice(0, 4)
  const selectedZoSession = zoSessions.find((session) => session.taskId === selectedZoTaskId) ?? visibleZoSessions[0]

  const teamLoad = useMemo(() => {
    return Math.min(100, Math.round((activeTasks.length / agents.length) * 100))
  }, [activeTasks.length, agents.length])

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
            ...completed.map((task) => `${task.label} shipped. +${task.reward} credits.`),
            ...failed.map((task) => `${task.label} failed review. Bug debt increased.`),
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
    setInspectedAgent((current) => ({
      agentId: agent.id,
      tick: (current?.tick ?? 0) + 1,
    }))
    setLog((items) => [
      `${agent.name} checked in. ${agent.title} focus ${agent.focus}%.`,
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
      `${selected.label} assigned to ${assignedAgent.title}. Waiting for Zo confirmation.`,
      ...items,
    ].slice(0, 7))
  }

  function cancelZoTask(session: ZoSession) {
    setZoSessions((currentSessions) => currentSessions.filter((item) => item.taskId !== session.taskId))
    setSelectedZoTaskId((current) => (current === session.taskId ? null : current))
    setLog((items) => [`Live handoff cancelled for ${session.taskLabel}.`, ...items].slice(0, 7))
  }

  function confirmZoTask(session: ZoSession) {
    const task = tasks.find((item) => item.id === session.taskId)
    const agent = agents.find((item) => item.id === session.agentId)
    if (!task || !agent || session.status !== 'pending') return

    setLog((items) => [`Confirmed: sending ${task.label} to the live control flow.`, ...items].slice(0, 7))
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
      setLog((items) => [`Live result returned for ${task.label}.`, ...items].slice(0, 7))
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
      setLog((items) => [`Live handoff failed for ${task.label}: ${message}`, ...items].slice(0, 7))
    }
  }

  function spawnTask() {
    const task = createTask(nextTaskId, {
      label: requestTitle.trim() || undefined,
      type: requestType,
      priority: requestPriority,
      source: requestSource,
      note: requestNote.trim() || undefined,
    })
    setTasks((currentTasks) => [task, ...currentTasks])
    setNextTaskId((id) => id + 1)
    setSelectedTask(task.id)
    setRequestTitle(taskTemplates[requestType][0])
    setRequestPriority('normal')
    setRequestSource('chat')
    setRequestNote('')
  }

  function endDay() {
    setMetrics((state) => ({
      ...state,
      day: state.day + 1,
      tokens: state.tokens + 180,
      happiness: Math.max(20, Math.min(100, state.happiness + (queuedTasks.length > 6 ? -6 : 4))),
    }))
    setTasks(makeInitialTasks())
    setNextTaskId((id) => id + 8)
    setSelectedTask(null)
    setSelectedZoTaskId(null)
    setZoSessions([])
    setLog((items) => [`Shift ${metrics.day + 1} planning started. Budget refreshed.`, ...items].slice(0, 7))
  }

  function upgradeAgent(agentId: AgentRole) {
    if (metrics.credits < 12) return

    setAgents((currentAgents) =>
      currentAgents.map((agent) =>
        agent.id === agentId
          ? {
              ...agent,
              speed: Number((agent.speed + 0.08).toFixed(2)),
              accuracy: Math.min(98, agent.accuracy + 2),
              focus: Math.min(100, agent.focus + 3),
            }
          : agent,
      ),
    )
    setMetrics((state) => ({ ...state, credits: state.credits - 12 }))
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
          <Metric label="Shift" value={metrics.day} />
          <Metric label="Closed" value={metrics.done} />
          <Metric label="Blocked" value={metrics.failed} />
          <Metric label="Capacity" value={metrics.tokens} />
          <Metric label="Morale" value={`${metrics.happiness}%`} />
          <Metric label="Budget" value={metrics.credits} />
        </div>

        <button className="primary-button" onClick={endDay}>
          Close shift
        </button>
      </section>

      <section className="workspace">
        <aside className="panel task-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Reception</p>
              <h2>Task intake</h2>
            </div>
            <span className="load-pill">Triage first</span>
          </div>

          <form
            className="reception-card"
            onSubmit={(event) => {
              event.preventDefault()
              spawnTask()
            }}
          >
            <label className="intake-field">
              <span>Request title</span>
              <input
                value={requestTitle}
                onChange={(event) => setRequestTitle(event.target.value)}
                placeholder="e.g. Review the onboarding flow"
              />
            </label>

            <div className="intake-row">
              <label className="intake-field">
                <span>Type</span>
                <select value={requestType} onChange={(event) => setRequestType(event.target.value as TaskType)}>
                  {Object.entries(taskLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="intake-field">
                <span>Priority</span>
                <select
                  value={requestPriority}
                  onChange={(event) => setRequestPriority(event.target.value as TaskPriority)}
                >
                  {Object.entries(taskPriorityLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="intake-row">
              <label className="intake-field">
                <span>Source</span>
                <select value={requestSource} onChange={(event) => setRequestSource(event.target.value as TaskSource)}>
                  {Object.entries(taskSourceLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="intake-field">
                <span>Brief note</span>
                <input
                  value={requestNote}
                  onChange={(event) => setRequestNote(event.target.value)}
                  placeholder="What should the team know?"
                />
              </label>
            </div>

            <div className="intake-actions">
              <button type="submit" className="intake-submit">
                Create task
              </button>
              <button
                type="button"
                className="intake-secondary"
                onClick={() => {
                  setRequestTitle(taskTemplates[requestType][0])
                  setRequestPriority('high')
                  setRequestSource('meeting')
                  setRequestNote('Needs quick triage and handoff.')
                }}
              >
                Use template
              </button>
            </div>

            <p className="intake-hint">
              Reception should capture the request, classify it, then send it to the right agent.
            </p>
          </form>

          <div className="task-list">
            {queuedTasks.map((task) => (
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
            ))}
          </div>

          <div className="assignment-box">
            <p className="eyebrow">Dispatch</p>
            <strong>{selected ? selected.label : 'Select a request'}</strong>
            <p className="queue-hint">
              High priority requests are listed first. Research → Plan → Code → Review keeps the flow sane.
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
          {furniture.map((item) => (
            <img
              alt={item.label}
              className="furniture"
              key={`${item.src}-${item.x}-${item.y}`}
              src={item.src}
              style={
                {
                  left: `${item.x}%`,
                  top: `${item.y}%`,
                  width: `${item.w}px`,
                } as React.CSSProperties
              }
            />
          ))}
          {Object.entries(stationPositions).map(([id, station]) => (
            <div
              className={`station ${id}`}
              key={id}
              style={{ left: `${station.x}%`, top: `${station.y}%` }}
            >
              <span>{station.label}</span>
            </div>
          ))}
          <button
            className={[
              'zoo-computer',
              zoSessions.some((session) => session.status === 'sending' || session.status === 'working')
                ? 'online'
                : '',
            ].filter(Boolean).join(' ')}
            onClick={() => setSelectedZoTaskId(visibleZoSessions[0]?.taskId ?? null)}
            style={
              {
                '--zoo-color': selectedZoSession
                  ? agents.find((agent) => agent.id === selectedZoSession.agentId)?.color
                  : '#79e7c5',
              } as React.CSSProperties
            }
            title="Open control desk sessions"
          >
            <span className="zoo-screen">
              <strong>ZO</strong>
              <small>{selectedZoSession ? zoStatusLabels[selectedZoSession.status] : 'Ready'}</small>
            </span>
            <span className="zoo-keyboard" />
          </button>

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
                  {assigned ? `${position.phase} ${progress}% ${taskLabels[assigned.type]}` : 'Idle'}
                </small>
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

        <aside className="panel agent-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Departments</p>
              <h2>Agent roster</h2>
            </div>
            <span className="load-pill">Occupancy {teamLoad}%</span>
          </div>

          <div className="agent-list">
            {agents.map((agent) => (
              <article
                className="agent-card"
                key={agent.id}
                style={{ '--agent-color': agent.color } as React.CSSProperties}
              >
                <div>
                  <span
                    aria-hidden="true"
                    className="mini-sprite"
                    style={{ '--pet-url': `url(${agent.pet})` } as React.CSSProperties}
                  />
                  <strong>{agent.name}</strong>
                  <small>{agent.title}</small>
                </div>
                <dl>
                  <div>
                    <dt>Speed</dt>
                    <dd>{agent.speed.toFixed(2)}x</dd>
                  </div>
                  <div>
                    <dt>Accuracy</dt>
                    <dd>{agent.accuracy}%</dd>
                  </div>
                  <div>
                    <dt>Focus</dt>
                    <dd>{agent.focus}%</dd>
                  </div>
                </dl>
                <button disabled={metrics.credits < 12} onClick={() => upgradeAgent(agent.id)}>
                  Upgrade 12c
                </button>
              </article>
            ))}
          </div>

          <div className="zoo-panel">
            <div className="panel-head compact">
              <div>
                <p className="eyebrow">Live Handoff</p>
                <h2>Control desk</h2>
              </div>
              <span className={selectedZoSession ? `zo-status ${selectedZoSession.status}` : 'zo-status'}>
                {selectedZoSession ? zoStatusLabels[selectedZoSession.status] : 'Ready'}
              </span>
            </div>

            {visibleZoSessions.length ? (
              <>
                <div className="zo-session-list">
                  {visibleZoSessions.map((session) => {
                    const agent = agents.find((item) => item.id === session.agentId)

                    return (
                      <button
                        className={selectedZoSession?.taskId === session.taskId ? 'selected' : ''}
                        key={session.taskId}
                        onClick={() => setSelectedZoTaskId(session.taskId)}
                        style={{ '--agent-color': agent?.color ?? '#79e7c5' } as React.CSSProperties}
                      >
                        <span className={`task-type ${session.taskType}`}>{taskLabels[session.taskType]}</span>
                        <strong>{session.taskLabel}</strong>
                        <small>{agent?.name ?? 'Agent'} · {zoStatusLabels[session.status]}</small>
                      </button>
                    )
                  })}
                </div>

                {selectedZoSession ? (
                  <div className="zo-result-card">
                    <div className="zo-result-head">
                      <span className={`task-type ${selectedZoSession.taskType}`}>
                        {roleResultCards[selectedZoSession.taskType].summaryLabel}
                      </span>
                      {selectedZoSession.confidence ? (
                        <strong>{selectedZoSession.confidence}% confidence</strong>
                      ) : null}
                    </div>

                    <p className="zo-summary">{selectedZoSession.summary ?? selectedZoSession.output}</p>

                    {selectedZoSession.insights?.length ? (
                      <div className="zo-insights">
                        {selectedZoSession.insights.map((insight) => (
                          <div key={`${insight.label}-${insight.value}`}>
                            <span>{insight.label}</span>
                            <strong>{insight.value}</strong>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {selectedZoSession.actions?.length ? (
                      <div className="zo-actions">
                        <span>Action cards</span>
                        <ol>
                          {selectedZoSession.actions.map((action, index) => (
                            <li key={`${action}-${index}`}>{action}</li>
                          ))}
                        </ol>
                      </div>
                    ) : null}

                    {selectedZoSession.status === 'pending' ? (
                      <div className="zo-confirm-actions">
                        <button onClick={() => confirmZoTask(selectedZoSession)}>Yes, send to Zo</button>
                        <button onClick={() => cancelZoTask(selectedZoSession)}>No, keep local</button>
                      </div>
                    ) : null}

                    <details className="zo-output">
                      <summary>Full Zo output</summary>
                      <p>{selectedZoSession.output}</p>
                      {selectedZoSession.conversationId ? (
                        <small>Conversation {selectedZoSession.conversationId}</small>
                      ) : null}
                    </details>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="zo-empty">Assign a task to send real work through Zo.</p>
            )}
          </div>

          <div className="log-box">
            <p className="eyebrow">Activity Log</p>
            {log.map((item, index) => (
              <p key={`${item}-${index}`}>{item}</p>
            ))}
          </div>
        </aside>
      </section>
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

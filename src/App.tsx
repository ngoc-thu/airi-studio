import { useEffect, useRef, useState } from 'react'
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

type ZoSessionMessage = {
  id: string
  role: 'system' | 'user' | 'assistant'
  title?: string
  body: string
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
  messages?: ZoSessionMessage[]
}

const stationPositions: Record<StationId, { x: number; y: number; label: string }> = {
  inbox: { x: 12, y: 76, label: 'Welcome desk' },
  library: { x: 21, y: 25, label: 'Files & Docs' },
  planning: { x: 24, y: 73, label: 'Meeting area' },
  terminal: { x: 56, y: 58, label: 'Zoo Computer' },
  review: { x: 82, y: 24, label: 'Log station' },
}

const dashboardMascots = [
  {
    id: 'tata',
    name: 'Tata',
    pet: '/pets/tata.webp',
    petCredit: 'Tata by Codex-Pets.net',
    x: 33,
    y: 86,
  },
] as const

const furniture = [
  { src: '/furniture/bookshelf-tall.png', x: 11, y: 20, w: 48, label: 'Archive shelf left' },
  { src: '/furniture/bookshelf.png', x: 19, y: 18, w: 48, label: 'Archive shelf center' },
  { src: '/furniture/bookshelf-tall.png', x: 28, y: 21, w: 48, label: 'Archive shelf right' },
  { src: '/furniture/board-wide.png', x: 21, y: 11, w: 82, label: 'Document index board' },
  { src: '/furniture/cabinet.png', x: 31, y: 27, w: 54, label: 'Archive cabinet' },
  { src: '/furniture/couch-blue.png', x: 18, y: 76, w: 82, label: 'Meeting couch left' },
  { src: '/furniture/couch-blue.png', x: 31, y: 76, w: 82, label: 'Meeting couch right' },
  { src: '/furniture/table-orange.png', x: 24, y: 79, w: 56, label: 'Meeting coffee table' },
  { src: '/furniture/green-board.png', x: 37, y: 64, w: 72, label: 'Planning board' },
  { src: '/furniture/work-desk.png', x: 56, y: 51, w: 126, label: 'Zoo command desk' },
  { src: '/furniture/terminal.png', x: 56, y: 45, w: 74, label: 'Zoo primary terminal' },
  { src: '/furniture/screen-wide.png', x: 47, y: 48, w: 58, label: 'Zoo left screen' },
  { src: '/furniture/screen-wide.png', x: 65, y: 48, w: 58, label: 'Zoo right screen' },
  { src: '/furniture/server-small.png', x: 45, y: 57, w: 42, label: 'Zoo node A' },
  { src: '/furniture/server-small.png', x: 69, y: 57, w: 42, label: 'Zoo node B' },
  { src: '/furniture/chair-orange.png', x: 56, y: 60, w: 34, label: 'Zoo operator chair' },
  { src: '/furniture/green-board.png', x: 80, y: 14, w: 96, label: 'Log overview board' },
  { src: '/furniture/table-orange.png', x: 81, y: 27, w: 54, label: 'Ops control desk' },
  { src: '/furniture/screen-wide.png', x: 76, y: 29, w: 46, label: 'Ops left monitor' },
  { src: '/furniture/screen-wide.png', x: 86, y: 29, w: 46, label: 'Ops right monitor' },
  { src: '/furniture/server-small.png', x: 79, y: 36, w: 40, label: 'Log server A' },
  { src: '/furniture/server-small.png', x: 85, y: 36, w: 40, label: 'Log server B' },
  { src: '/furniture/cabinet.png', x: 90, y: 23, w: 48, label: 'Incident drawer' },
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

function getLatestZoAssistantOutput(session: ZoSession) {
  const latestAssistantMessage = [...(session.messages ?? [])].reverse().find((message) => message.role === 'assistant')
  return latestAssistantMessage?.body?.trim() || session.summary || session.output
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

const idleRoamRoutes: Record<AgentRole, Point[]> = {
  research: [
    { x: 12, y: 76 },
    { x: 16, y: 62 },
    { x: 20, y: 48 },
    { x: 16, y: 62 },
  ],
  plan: [
    { x: 12, y: 76 },
    { x: 22, y: 76 },
    { x: 30, y: 76 },
    { x: 38, y: 72 },
    { x: 30, y: 76 },
  ],
  code: [
    { x: 34, y: 76 },
    { x: 44, y: 70 },
    { x: 55, y: 69 },
    { x: 48, y: 74 },
    { x: 40, y: 76 },
  ],
  review: [
    { x: 69, y: 66 },
    { x: 73, y: 45 },
    { x: 79, y: 38 },
    { x: 75, y: 52 },
    { x: 69, y: 66 },
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

const STORAGE_KEYS = {
  tasks: 'airi-studio.tasks',
  selectedTask: 'airi-studio.selected-task',
  nextTaskId: 'airi-studio.next-task-id',
  log: 'airi-studio.log',
  zoSessions: 'airi-studio.zo-sessions',
  selectedZoTaskId: 'airi-studio.selected-zo-task-id',
} as const

function readStoredValue<T>(key: string, fallback: T) {
  if (typeof window === 'undefined') return fallback

  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function makeInitialTasks() {
  return readStoredValue<Task[]>(STORAGE_KEYS.tasks, [])
}

function makeInitialLog() {
  return readStoredValue<string[]>(STORAGE_KEYS.log, [
    '[SYSTEM] Office ready. Waiting for a new task or Zoo chat request.',
    '[TASK] No active intake yet. Create a task to start the workflow.',
  ])
}

function makeInitialZoSessions() {
  return readStoredValue<ZoSession[]>(STORAGE_KEYS.zoSessions, [])
}

function makeInitialSelectedTask() {
  return readStoredValue<number | null>(STORAGE_KEYS.selectedTask, null)
}

function makeInitialSelectedZoTaskId() {
  return readStoredValue<number | null>(STORAGE_KEYS.selectedZoTaskId, null)
}

function makeInitialNextTaskId() {
  const stored = readStoredValue<number | null>(STORAGE_KEYS.nextTaskId, null)
  if (typeof stored === 'number' && Number.isFinite(stored) && stored > 0) return stored

  const maxExistingId = makeInitialTasks().reduce((maxId, task) => Math.max(maxId, task.id), 0)
  return maxExistingId + 1
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

function getIdleRoamPosition(agent: Agent) {
  const roamRoute = idleRoamRoutes[agent.id] ?? [stationPositions[agent.station]]
  const points = roamRoute.length > 1 ? [...roamRoute, roamRoute[0]] : roamRoute
  const cycleMs = 36_000 + Object.keys(idleRoamRoutes).indexOf(agent.id) * 2_500
  const walkWindowMs = 7_000
  const now = Date.now()
  const cycleOffset = now % cycleMs
  const isWalking = cycleOffset < walkWindowMs

  if (!isWalking) {
    const restPoint = roamRoute[0] ?? stationPositions[agent.station]
    return {
      x: restPoint.x,
      y: restPoint.y,
      targetX: restPoint.x,
      targetY: restPoint.y,
      route: points,
      walking: false,
      animationRow: 0,
      phase: 'Idle',
    }
  }

  const rawPercent = cycleOffset / walkWindowMs
  const current = interpolateRoute(points, rawPercent)
  const target = points.at(-1) ?? stationPositions[agent.station]

  return {
    x: current.x,
    y: current.y,
    targetX: target.x,
    targetY: target.y,
    route: points,
    walking: rawPercent < 0.98,
    animationRow: current.directionX >= 0 ? 1 : 2,
    phase: rawPercent < 0.98 ? 'Roaming' : 'Idle',
  }
}

function getAgentPosition(agent: Agent, task?: Task) {
  const route = getRoute(agent)
  const target = route.at(-1) ?? stationPositions.inbox
  const targetX = target.x
  const targetY = target.y

  if (!task) {
    return getIdleRoamPosition(agent)
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
  const [agents] = useState(baseAgents)
  const [tasks, setTasks] = useState(makeInitialTasks)
  const [selectedTask, setSelectedTask] = useState<number | null>(makeInitialSelectedTask)
  const [nextTaskId, setNextTaskId] = useState(makeInitialNextTaskId)
  const [requestTitle, setRequestTitle] = useState('')
  const [requestType, setRequestType] = useState<TaskType>('plan')
  const [requestPriority, setRequestPriority] = useState<TaskPriority>('high')
  const [metrics, setMetrics] = useState<Metrics>({
    day: 1,
    done: 0,
    failed: 0,
    tokens: 320,
    happiness: 72,
    credits: 18,
  })
  const [log, setLog] = useState<string[]>(makeInitialLog)
  const [inspectedAgent, setInspectedAgent] = useState<AgentInspect | null>(null)
  const [selectedAgentId, setSelectedAgentId] = useState<AgentRole | null>(null)
  const [zoSessions, setZoSessions] = useState<ZoSession[]>(makeInitialZoSessions)
  const [selectedZoTaskId, setSelectedZoTaskId] = useState<number | null>(makeInitialSelectedZoTaskId)
  const [zoFollowUp, setZoFollowUp] = useState('Continue the research with next steps and unresolved questions.')
  const [zooChatPrompt, setZooChatPrompt] = useState('')
  const [taskView, setTaskView] = useState<'brief' | 'zoo-chat'>('brief')
  const [screen, setScreen] = useState<'dashboard' | 'tasks' | 'chat' | 'sessions' | 'documents' | 'logs'>('dashboard')
  const [chatSignal, setChatSignal] = useState<'idle' | 'working' | 'received'>('idle')
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
    window.localStorage.setItem(STORAGE_KEYS.zoSessions, JSON.stringify(zoSessions))
  }, [zoSessions])

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

    if (!task || !agent || !session.conversationId || !followUp) return

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
    if (!prompt) return

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

  function endDay() {
    setMetrics((state) => ({
      ...state,
      day: state.day + 1,
      tokens: state.tokens + 180,
      happiness: Math.max(20, Math.min(100, state.happiness + (queuedTasks.length > 6 ? -6 : 4))),
    }))
    setTasks(makeInitialTasks())
    setNextTaskId((id) => id + 1)
    setSelectedTask(null)
    setSelectedZoTaskId(null)
    setZoSessions([])
    setLog((items) => [`[SYSTEM] Shift ${metrics.day + 1} started. Budget refreshed and local session state reset.`, ...items].slice(0, 7))
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
              <h2>Brief composer</h2>
            </div>
            <span className="load-pill">Auto research</span>
          </div>

          <form
            className="reception-card brief-composer"
            onSubmit={(event) => {
              event.preventDefault()
              spawnTask()
            }}
          >
            <label className="intake-field">
              <span>Task content</span>
              <textarea
                value={requestTitle}
                onChange={(event) => setRequestTitle(event.target.value)}
                placeholder="Describe the task details..."
                rows={4}
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

            <div className="intake-actions">
              <button type="submit" className="intake-submit">
                Create task
              </button>
            </div>

            <p className="intake-hint">
              Every new brief starts with research intake at the Zoo Computer before manual dispatch.
            </p>
          </form>

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

          <button type="button" className="office-area area-meeting" onClick={() => setScreen('tasks')}>
            <span className="office-area-label">Meeting area</span>
            <span className="office-area-info">
              <strong>Meeting & planning</strong>
              <small>Discuss tasks, review queue, and organize the next work pass.</small>
              <em>Open Tasks screen</em>
            </span>
          </button>

          <button
            type="button"
            className="office-area area-zoo"
            onClick={() => {
              setSelectedZoTaskId(visibleZoSessions[0]?.taskId ?? null)
              setScreen('chat')
            }}
          >
            <span className="office-area-label">Zoo Computer</span>
            <span className="office-area-info">
              <strong>Zoo terminal</strong>
              <small>Connect directly to Zoo Computer and talk through research in a dedicated chat workspace.</small>
              <em>Open Chat screen</em>
            </span>
            <span
              className={[
                'zoo-computer',
                zoSessions.some((session) => session.status === 'sending' || session.status === 'working')
                  ? 'online'
                  : '',
              ].filter(Boolean).join(' ')}
              style={
                {
                  '--zoo-color': selectedZoSession
                    ? agents.find((agent) => agent.id === selectedZoSession.agentId)?.color
                    : '#79e7c5',
                } as React.CSSProperties
              }
            >
              <span className="zoo-screen">
                <strong>ZO</strong>
                <small>{selectedZoSession ? zoStatusLabels[selectedZoSession.status] : 'Ready'}</small>
              </span>
              <span className="zoo-keyboard" />
            </span>
          </button>

          <button type="button" className="office-area area-docs" onClick={() => setScreen('documents')}>
            <span className="office-area-label">Files & Docs</span>
            <span className="office-area-info">
              <strong>Stored files and references</strong>
              <small>Browse files, research briefs, saved notes, and reference materials from Zoo Computer.</small>
              <em>Open Files & Docs screen</em>
            </span>
          </button>

          <button
            type="button"
            className="office-area area-zoo-chat"
            onClick={() => {
              setTaskView('zoo-chat')
              setSelectedZoTaskId(visibleZoSessions[0]?.taskId ?? null)
              setScreen('chat')
            }}
          >
            <span className="office-area-label">Zoo chat</span>
            <span className="office-area-info">
              <strong>Talk to Zoo directly</strong>
              <small>Open a direct conversation workspace for Zoo Computer with a dedicated chat tab.</small>
              <em>Open Chat · Zoo computer</em>
            </span>
            <span
              className={[
                'zoo-computer',
                'zoo-computer-dashboard-chat',
                activeZoSession && (activeZoSession.status === 'sending' || activeZoSession.status === 'working')
                  ? 'online'
                  : '',
              ].filter(Boolean).join(' ')}
              style={
                {
                  '--zoo-color': activeZoSession
                    ? agents.find((agent) => agent.id === activeZoSession.agentId)?.color
                    : '#79e7c5',
                } as React.CSSProperties
              }
            >
              <span className="zoo-screen">
                <strong>ZO</strong>
                <small>{activeZoSession ? zoStatusLabels[activeZoSession.status] : 'Ready'}</small>
              </span>
              <span className="zoo-keyboard" />
            </span>
          </button>

          <button type="button" className="office-area area-logs" onClick={() => setScreen('logs')}>
            <span className="office-area-label">Log station</span>
            <span className="office-area-info">
              <strong>Operations log</strong>
              <small>Monitor recent events, dispatch history, and system-level office activity.</small>
              <em>Open System log</em>
            </span>
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
            <section className="menu-card task-composer-card">
              <div className="panel-head compact">
                <div>
                  <p className="eyebrow">Task intake</p>
                  <h3>{taskView === 'zoo-chat' ? 'Direct chat with Zoo Computer' : 'Create task in Tasks tab'}</h3>
                </div>
              </div>

              <div className="control-tabs">
                <button type="button" className="active">
                  Brief composer
                </button>
                <button type="button" onClick={() => setScreen('chat')}>
                  Open chat
                </button>
                <button type="button" onClick={() => setScreen('sessions')}>
                  Open sessions
                </button>
              </div>

              <form
                className="reception-card brief-composer task-tab-composer"
                onSubmit={(event) => {
                  event.preventDefault()
                  spawnTask()
                }}
              >
                <label className="intake-field">
                  <span>Task content</span>
                  <textarea
                    value={requestTitle}
                    onChange={(event) => setRequestTitle(event.target.value)}
                    placeholder="Describe the task details..."
                    rows={4}
                  />
                </label>

                <div className="intake-row">
                  <label className="intake-field">
                    <span>Type</span>
                    <select value={requestType} onChange={(event) => setRequestType(event.target.value as TaskType)}>
                      {Object.entries(taskLabels).map(([value, label]) => (
                        <option key={`tasks-tab-type-${value}`} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="intake-field">
                    <span>Priority</span>
                    <select value={requestPriority} onChange={(event) => setRequestPriority(event.target.value as TaskPriority)}>
                      {Object.entries(taskPriorityLabels).map(([value, label]) => (
                        <option key={`tasks-tab-priority-${value}`} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="intake-actions">
                  <button type="submit" className="intake-submit">
                    Create task
                  </button>
                </div>

                <p className="intake-hint">
                  Tasks created here use the same auto-research flow as the Dashboard composer.
                </p>
              </form>
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
              className="dashboard-mascot"
              style={{ left: `${mascot.x}%`, top: `${mascot.y}%` } as React.CSSProperties}
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
                    <button type="submit" className="intake-submit">
                      {selectedZoSession?.conversationId ? 'Send' : 'Start chat'}
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
                        disabled={!activeZoSession.conversationId || !zoFollowUp.trim()}
                        onClick={() => void continueZoSession(activeZoSession)}
                      >
                        Continue session
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


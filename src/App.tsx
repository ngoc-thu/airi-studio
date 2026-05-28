import { useEffect, useMemo, useState } from 'react'
import './App.css'

type AgentRole = 'research' | 'code' | 'review' | 'deploy'
type StationId = 'inbox' | 'library' | 'terminal' | 'review' | 'server'
type TaskType = AgentRole
type TaskState = 'queued' | 'active' | 'done' | 'failed'

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

type ZoSessionStatus = 'sending' | 'working' | 'done' | 'failed'

type ZoSession = {
  taskId: number
  taskLabel: string
  taskType: TaskType
  agentId: AgentRole
  status: ZoSessionStatus
  output: string
  conversationId?: string | null
}

const stationPositions: Record<StationId, { x: number; y: number; label: string }> = {
  inbox: { x: 12, y: 76, label: 'Inbox' },
  library: { x: 21, y: 25, label: 'Research Zone' },
  terminal: { x: 50, y: 53, label: 'Code Zone' },
  review: { x: 79, y: 30, label: 'Review Zone' },
  server: { x: 83, y: 72, label: 'Deploy Zone' },
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
  { src: '/furniture/cabinet.png', x: 88, y: 77, w: 70, label: 'Deploy rack' },
  { src: '/furniture/screen-wide.png', x: 78, y: 78, w: 50, label: 'Deploy status screen' },
  { src: '/furniture/server-small.png', x: 83, y: 66, w: 42, label: 'Deploy node' },
  { src: '/furniture/terminal.png', x: 76, y: 70, w: 36, label: 'Deploy terminal' },
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
  {
    id: 'deploy',
    name: 'Ace Taffy',
    title: 'DevOps',
    station: 'server',
    speed: 1,
    accuracy: 86,
    focus: 84,
    color: '#ff7aa8',
    pet: '/pets/ace-taffy.webp',
    petCredit: 'Ace Taffy by CodexPets.net',
  },
]

const taskTemplates: Record<TaskType, string[]> = {
  research: ['Map unknown API', 'Collect source notes', 'Compare model tradeoffs', 'Summarize user brief'],
  code: ['Build feature slice', 'Patch UI bug', 'Wire game state', 'Refactor task loop'],
  review: ['Catch regression', 'Audit edge cases', 'Review pull request', 'Test release path'],
  deploy: ['Ship preview build', 'Fix broken pipeline', 'Scale token queue', 'Restore production'],
}

const taskLabels: Record<TaskType, string> = {
  research: 'Research',
  code: 'Code',
  review: 'Review',
  deploy: 'Deploy',
}

const zoStatusLabels: Record<ZoSessionStatus, string> = {
  sending: 'Sending',
  working: 'Working',
  done: 'Done',
  failed: 'Failed',
}

const agentOffsets: Record<AgentRole, { x: number; y: number }> = {
  research: { x: -1, y: 12 },
  code: { x: 0, y: 9 },
  review: { x: 0, y: 8 },
  deploy: { x: -2, y: 0 },
}

const workingRows: Record<TaskType, number> = {
  research: 6,
  code: 7,
  review: 8,
  deploy: 7,
}

const hallwayRoutes: Record<AgentRole, Point[]> = {
  research: [
    { x: 12, y: 76 },
    { x: 16, y: 62 },
    { x: 20, y: 48 },
  ],
  code: [
    { x: 12, y: 76 },
    { x: 34, y: 76 },
    { x: 38, y: 66 },
    { x: 50, y: 62 },
  ],
  review: [
    { x: 12, y: 76 },
    { x: 34, y: 76 },
    { x: 38, y: 66 },
    { x: 69, y: 66 },
    { x: 73, y: 45 },
    { x: 79, y: 38 },
  ],
  deploy: [
    { x: 12, y: 76 },
    { x: 34, y: 76 },
    { x: 60, y: 76 },
    { x: 76, y: 74 },
  ],
}

function createTask(id: number): Task {
  const types: TaskType[] = ['research', 'code', 'review', 'deploy']
  const type = types[Math.floor(Math.random() * types.length)]
  const templates = taskTemplates[type]

  return {
    id,
    label: templates[Math.floor(Math.random() * templates.length)],
    type,
    difficulty: 45 + Math.floor(Math.random() * 46),
    reward: 8 + Math.floor(Math.random() * 10),
    state: 'queued',
    progress: 0,
  }
}

function makeInitialTasks() {
  return Array.from({ length: 8 }, (_, index) => createTask(index + 1))
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
  const [metrics, setMetrics] = useState<Metrics>({
    day: 1,
    done: 0,
    failed: 0,
    tokens: 320,
    happiness: 72,
    credits: 18,
  })
  const [log, setLog] = useState<string[]>([
    'Day 1 started. Assign queued work to the right agent.',
    'Combo rule: Research -> Code -> Review -> Deploy keeps happiness high.',
  ])
  const [inspectedAgent, setInspectedAgent] = useState<AgentInspect | null>(null)
  const [zoSessions, setZoSessions] = useState<ZoSession[]>([])
  const [selectedZoTaskId, setSelectedZoTaskId] = useState<number | null>(null)

  const selected = tasks.find((task) => task.id === selectedTask) ?? null
  const queuedTasks = tasks.filter((task) => task.state === 'queued')
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
        status: 'sending' as const,
        output: 'Opening a live Zo Computer session...',
      },
      ...currentSessions.filter((session) => session.taskId !== selected.id),
    ].slice(0, 8))
    setLog((items) => [
      `${selected.label} assigned to ${assignedAgent.title}. Sending to Zo Computer.`,
      ...items,
    ].slice(0, 7))
    void sendTaskToZo(selected, assignedAgent)
  }

  async function sendTaskToZo(task: Task, agent: Agent) {
    setZoSessions((currentSessions) =>
      currentSessions.map((session) =>
        session.taskId === task.id
          ? { ...session, status: 'working', output: 'Zo accepted the request. Waiting for result...' }
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

      setZoSessions((currentSessions) =>
        currentSessions.map((session) =>
          session.taskId === task.id
            ? {
                ...session,
                status: 'done',
                output: data?.output ?? 'Zo completed the task.',
                conversationId: data?.conversationId ?? null,
              }
            : session,
        ),
      )
      setLog((items) => [`Zo returned a result for ${task.label}.`, ...items].slice(0, 7))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Zo Computer request failed.'
      setZoSessions((currentSessions) =>
        currentSessions.map((session) =>
          session.taskId === task.id ? { ...session, status: 'failed', output: message } : session,
        ),
      )
      setLog((items) => [`Zo Computer failed for ${task.label}: ${message}`, ...items].slice(0, 7))
    }
  }

  function spawnTask() {
    const task = createTask(nextTaskId)
    setTasks((currentTasks) => [task, ...currentTasks])
    setNextTaskId((id) => id + 1)
    setSelectedTask(task.id)
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
    setLog((items) => [`Day ${metrics.day + 1} planning started. Token budget refreshed.`, ...items].slice(0, 7))
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
          <span className="brand-mark">AI</span>
          <div>
            <p className="eyebrow">Agent management sim</p>
            <h1>Airi Studio</h1>
          </div>
        </div>

        <div className="stat-strip" aria-label="Studio metrics">
          <Metric label="Day" value={metrics.day} />
          <Metric label="Done" value={metrics.done} />
          <Metric label="Bugs" value={metrics.failed} />
          <Metric label="Tokens" value={metrics.tokens} />
          <Metric label="Mood" value={`${metrics.happiness}%`} />
          <Metric label="Credits" value={metrics.credits} />
        </div>

        <button className="primary-button" onClick={endDay}>
          End day
        </button>
      </section>

      <section className="workspace">
        <aside className="panel task-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Queue</p>
              <h2>Incoming Work</h2>
            </div>
            <button className="icon-button" onClick={spawnTask} title="Add task">
              +
            </button>
          </div>

          <div className="task-list">
            {queuedTasks.map((task) => (
              <button
                className={selectedTask === task.id ? 'task-card selected' : 'task-card'}
                key={task.id}
                onClick={() => setSelectedTask(task.id)}
              >
                <span className={`task-type ${task.type}`}>{taskLabels[task.type]}</span>
                <strong>{task.label}</strong>
                <small>Difficulty {task.difficulty} / Reward {task.reward}</small>
              </button>
            ))}
          </div>

          <div className="assignment-box">
            <p className="eyebrow">Assign</p>
            <strong>{selected ? selected.label : 'Select a task'}</strong>
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
            title="Open Zoo Computer sessions"
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
              <p className="eyebrow">Team</p>
              <h2>Agents</h2>
            </div>
            <span className="load-pill">Load {teamLoad}%</span>
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
                <p className="eyebrow">Live Control</p>
                <h2>Zoo Computer</h2>
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
                  <div className="zo-output">
                    <p>{selectedZoSession.output}</p>
                    {selectedZoSession.conversationId ? (
                      <small>Conversation {selectedZoSession.conversationId}</small>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="zo-empty">Assign a task to send real work through Zo.</p>
            )}
          </div>

          <div className="log-box">
            <p className="eyebrow">Studio Log</p>
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

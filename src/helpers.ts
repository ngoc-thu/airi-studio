import type { Agent, Point, Task, TaskPriority, TaskType, ZoInsight, ZoSession } from './types'
import {
  agentOffsets,
  hallwayRoutes,
  idleRoamRoutes,
  stationPositions,
  taskTemplates,
  workingRows,
} from './constants'

export function cleanZoOutput(output: string) {
  return output.replace(/\r\n/g, '\n').trim()
}

export function makeZoSummary(output: string) {
  const cleaned = cleanZoOutput(output)
  const firstLine = cleaned
    .split('\n')
    .map((line) => line.replace(/^[-*#\d.\s]+/, '').trim())
    .find(Boolean)

  if (!firstLine) return 'Zo completed the request.'
  return firstLine.length > 132 ? `${firstLine.slice(0, 129)}...` : firstLine
}

export function getLatestZoAssistantOutput(session: ZoSession) {
  const latestAssistantMessage = [...(session.messages ?? [])].reverse().find((message) => message.role === 'assistant')
  return latestAssistantMessage?.body?.trim() || session.summary || session.output
}

export function extractZoActions(output: string, fallback: string[]) {
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

export function makeZoInsights(task: Task, agent: Agent, output: string): ZoInsight[] {
  const cleaned = cleanZoOutput(output)
  const wordCount = cleaned ? cleaned.split(/\s+/).length : 0
  const fit = agent.id === task.type ? 'Matched role' : 'Cross-role assist'

  return [
    { label: 'Role fit', value: fit },
    { label: 'Signal', value: `${wordCount} words` },
    { label: 'Source', value: 'Zo live' },
  ]
}

export function createTask(
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

export function readStoredValue<T>(key: string, fallback: T) {
  if (typeof window === 'undefined') return fallback

  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function makeInitialTasks() {
  return readStoredValue<Task[]>('airi-studio.tasks', [])
}

export function makeInitialLog() {
  return readStoredValue<string[]>('airi-studio.log', [
    '[SYSTEM] Office ready. Waiting for a new task or Zoo chat request.',
    '[TASK] No active intake yet. Create a task to start the workflow.',
  ])
}

export function makeInitialZoSessions() {
  return readStoredValue<ZoSession[]>('airi-studio.zoSessions', [])
}

export function makeInitialSelectedTask() {
  return readStoredValue<number | null>('airi-studio.selected-task', null)
}

export function makeInitialSelectedZoTaskId() {
  return readStoredValue<number | null>('airi-studio.selected-zo-task-id', null)
}

export function makeInitialNextTaskId() {
  const stored = readStoredValue<number | null>('airi-studio.next-task-id', null)
  if (typeof stored === 'number' && Number.isFinite(stored) && stored > 0) return stored

  const maxExistingId = makeInitialTasks().reduce((maxId, task) => Math.max(maxId, task.id), 0)
  return maxExistingId + 1
}

export function priorityRank(priority: TaskPriority) {
  return priority === 'high' ? 0 : priority === 'normal' ? 1 : 2
}

export function getRoute(agent: Agent) {
  const offset = agentOffsets[agent.id]
  const target = stationPositions[agent.station]
  const targetPoint = { x: target.x + offset.x, y: target.y + offset.y }
  const route = hallwayRoutes[agent.id] ?? [stationPositions.inbox]

  return [...route.slice(0, -1), targetPoint]
}

export function interpolateRoute(route: Point[], percent: number) {
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

export function getIdleRoamPosition(agent: Agent) {
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

export function getAgentPosition(agent: Agent, task?: Task) {
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

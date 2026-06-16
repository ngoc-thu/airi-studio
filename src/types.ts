export type AgentRole = 'research' | 'plan' | 'code' | 'review'
export type StationId = 'inbox' | 'library' | 'planning' | 'terminal' | 'review'
export type TaskType = AgentRole
export type TaskState = 'queued' | 'active' | 'done' | 'failed'
export type TaskPriority = 'low' | 'normal' | 'high'
export type TaskSource = 'chat' | 'meeting' | 'system'

export type Agent = {
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

export type Task = {
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

export type Metrics = {
  day: number
  done: number
  failed: number
  tokens: number
  happiness: number
  credits: number
}

export type Point = {
  x: number
  y: number
}

export type AgentInspect = {
  agentId: AgentRole
  tick: number
}

export type ZoSessionStatus = 'pending' | 'sending' | 'working' | 'done' | 'failed'

export type ZoInsight = {
  label: string
  value: string
}

export type ZoSessionMessage = {
  id: string
  role: 'system' | 'user' | 'assistant'
  title?: string
  body: string
}

export type ZoSession = {
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

export interface Furniture {
  src: string
  x: number
  y: number
  w: number
  label: string
  desc: string
  status: string
}

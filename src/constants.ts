import type { Agent, AgentRole, Furniture, Point, StationId, TaskPriority, TaskSource, TaskType, ZoSessionStatus } from './types'

export const stationPositions: Record<StationId, { x: number; y: number; label: string }> = {
  inbox: { x: 5, y: 72, label: 'Welcome desk' },
  library: { x: 17, y: 34, label: 'Files & Docs' },
  planning: { x: 20, y: 76, label: 'Meeting area' },
  terminal: { x: 44, y: 34, label: 'Zoo Computer' },
  review: { x: 76, y: 34, label: 'Log station' },
}

export const dashboardMascots = [
  {
    id: 'tata',
    name: 'Tata',
    pet: '/pets/tata.webp',
    petCredit: 'Tata by Codex-Pets.net',
    x: 87,
    y: 66,
    route: [
      { x: 87, y: 66 },
      { x: 92, y: 72 },
      { x: 88, y: 78 },
      { x: 83, y: 72 },
      { x: 87, y: 66 },
    ],
  },
] as const

export const furniture: readonly Furniture[] = [
  // --- Files & Docs Room (top-left: x 2%-32%, y 8%-50%) ---
  // Back wall: bookshelves lined up
  { src: '/furniture/bookshelf-tall.png', x: 6,  y: 16, w: 56, label: 'Archive shelf left',   desc: 'Stores historical agent run logs and archives.', status: '94% Full' },
  { src: '/furniture/bookshelf-tall.png', x: 13, y: 13, w: 56, label: 'Archive shelf center', desc: 'Contains agent policy manuals and documents.',    status: 'Nominal' },
  { src: '/furniture/bookshelf-tall.png', x: 20, y: 16, w: 56, label: 'Archive shelf right',  desc: 'Saved memory files and workspace backups.',       status: 'Nominal' },
  { src: '/furniture/bookshelf.png',      x: 27, y: 13, w: 56, label: 'Reference shelf',      desc: 'Quick-reference books and API docs.',             status: 'Nominal' },
  // Middle desk with monitor
  { src: '/furniture/monitor-desk.png',   x: 12, y: 31, w: 90, label: 'Document index board', desc: 'Index board for active documentation.',           status: 'Updated' },
  { src: '/furniture/cabinet.png',        x: 27, y: 24, w: 64, label: 'Archive cabinet',      desc: 'Secure biometric cabinet for credentials.',       status: 'Locked' },
  { src: '/furniture/chair-orange.png',   x: 12, y: 38, w: 40, label: 'Research chair',       desc: 'Ergonomic chair at the document desk.',           status: 'Empty' },

  // --- Meeting Area Room (bottom-left: x 2%-32%, y 54%-96%) ---
  { src: '/furniture/green-board.png',    x: 17, y: 57, w: 112, label: 'Planning board',       desc: 'Holographic board showing milestone statistics.', status: 'Nominal' },
  { src: '/furniture/couch-blue.png',     x: 7,  y: 70, w: 96,  label: 'Meeting couch left',   desc: 'Ergonomic cyber lounge sofa for workspace planning.', status: 'Available' },
  { src: '/furniture/couch-blue.png',     x: 24, y: 70, w: 96,  label: 'Meeting couch right',  desc: 'Ergonomic cyber lounge sofa for workspace planning.', status: 'Available' },
  { src: '/furniture/table-orange.png',   x: 16, y: 80, w: 80,  label: 'Meeting coffee table', desc: 'Central coffee table with neon support base.',   status: 'Clean' },

  // --- Zoo Computer Room (top-center: x 34%-64%, y 8%-50%) ---
  { src: '/furniture/screen-wide.png',    x: 37, y: 14, w: 96,  label: 'Zoo left screen',       desc: 'Monitors Zoo Computer CPU/memory health.', status: 'Nominal' },
  { src: '/furniture/screen-wide.png',    x: 51, y: 11, w: 96,  label: 'Zoo center screen',     desc: 'Displays prompt queue and active states.',  status: 'Nominal' },
  { src: '/furniture/terminal.png',       x: 45, y: 24, w: 80,  label: 'Zoo primary terminal',  desc: 'Primary CLI client interface to Zoo Computer.', status: 'Online' },
  { src: '/furniture/work-desk.png',      x: 45, y: 33, w: 140, label: 'Zoo command desk',       desc: 'Central workspace desk for Zoo terminal.', status: 'Nominal' },
  { src: '/furniture/server-small.png',   x: 35, y: 38, w: 52,  label: 'Zoo node A',            desc: 'Calculates active session vector embeddings.', status: 'Active' },
  { src: '/furniture/server-small.png',   x: 56, y: 38, w: 52,  label: 'Zoo node B',            desc: 'Caches active agent context paths.',        status: 'Active' },
  { src: '/furniture/chair-orange.png',   x: 45, y: 42, w: 40,  label: 'Zoo operator chair',    desc: 'Operator chair with glowing accent lines.', status: 'Empty' },

  // --- Log Station Room (top-right: x 66%-98%, y 8%-50%) ---
  { src: '/furniture/board-wide.png',     x: 76, y: 12, w: 160, label: 'Log overview board',  desc: 'Holographic display showing real-time event logs.', status: 'Nominal' },
  { src: '/furniture/screen-wide.png',    x: 69, y: 24, w: 80,  label: 'Ops left monitor',    desc: 'Monitors Vercel API and backend health.',     status: 'Nominal' },
  { src: '/furniture/screen-wide.png',    x: 84, y: 24, w: 80,  label: 'Ops right monitor',   desc: 'Displays system telemetry and stats.',         status: 'Nominal' },
  { src: '/furniture/work-desk.png',      x: 76, y: 32, w: 120, label: 'Ops control desk',    desc: 'Control desk for operations monitoring.',      status: 'Nominal' },
  { src: '/furniture/server-small.png',   x: 68, y: 38, w: 48,  label: 'Log server A',        desc: 'Aggregates stdout and stderr messages.',       status: 'Online' },
  { src: '/furniture/server-small.png',   x: 76, y: 40, w: 48,  label: 'Log server B',        desc: 'Persists session logs to workspace logs.',     status: 'Online' },
  { src: '/furniture/server-small.png',   x: 84, y: 38, w: 48,  label: 'Log server C',        desc: 'Handles error trace archival.',                status: 'Online' },
  { src: '/furniture/cabinet.png',        x: 95, y: 26, w: 52,  label: 'Incident drawer',     desc: 'Archive of past runtime crash reports.',       status: 'Locked' },

  // --- Zoo Chat Room (bottom-center: x 46%-78%, y 54%-96%) ---
  { src: '/furniture/tv-console.png',     x: 55, y: 58, w: 110, label: 'Zoo chat display',       desc: 'Wide display for active Zoo chat sessions.', status: 'Nominal' },
  { src: '/furniture/monitor-desk.png',   x: 61, y: 66, w: 100, label: 'Zoo chat terminal',      desc: 'Chat CLI for direct Zoo conversations.',     status: 'Online' },
  { src: '/furniture/work-desk.png',      x: 61, y: 74, w: 130, label: 'Zoo chat desk',          desc: 'Zoo chat direct workspace desk.',             status: 'Nominal' },
  { src: '/furniture/server-small.png',   x: 48, y: 72, w: 48,  label: 'Zoo chat node A',        desc: 'Chat session routing server.',               status: 'Active' },
  { src: '/furniture/chair-orange.png',   x: 61, y: 81, w: 40,  label: 'Zoo chat operator chair',desc: 'Operator chair at Zoo Chat desk.',            status: 'Empty' },
] as const

export const baseAgents: Agent[] = [
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

export const taskTemplates: Record<TaskType, string[]> = {
  research: ['Map unknown API', 'Collect source notes', 'Compare model tradeoffs', 'Summarize brief'],
  plan: ['Draft implementation plan', 'Break down feature steps', 'Design work sequence', 'Estimate task scope'],
  code: ['Build feature slice', 'Patch UI bug', 'Wire game state', 'Refactor task loop'],
  review: ['Catch regression', 'Audit edge cases', 'Review pull request', 'Test release path'],
}

export const taskLabels: Record<TaskType, string> = {
  research: 'Research',
  plan: 'Plan',
  code: 'Code',
  review: 'Review',
}

export const taskPriorityLabels: Record<TaskPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
}

export const taskSourceLabels: Record<TaskSource, string> = {
  chat: 'Chat',
  meeting: 'Meeting',
  system: 'System',
}

export const zoStatusLabels: Record<ZoSessionStatus, string> = {
  pending: 'Confirm',
  sending: 'Sending',
  working: 'Working',
  done: 'Done',
  failed: 'Failed',
}

export const roleResultCards: Record<TaskType, { summaryLabel: string; sections: string[] }> = {
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

export const agentOffsets: Record<AgentRole, { x: number; y: number }> = {
  research: { x: -1, y: 12 },
  plan: { x: -1, y: 6 },
  code: { x: 0, y: 7 },
  review: { x: 0, y: 8 },
}

export const workingRows: Record<TaskType, number> = {
  research: 6,
  plan: 6,
  code: 7,
  review: 8,
}

export const hallwayRoutes: Record<AgentRole, Point[]> = {
  research: [
    { x: 5, y: 76 },
    { x: 5, y: 54 },
    { x: 17, y: 54 },
    { x: 17, y: 40 },
  ],
  plan: [
    { x: 5, y: 76 },
    { x: 16, y: 76 },
    { x: 20, y: 76 },
  ],
  code: [
    { x: 5, y: 76 },
    { x: 33, y: 76 },
    { x: 33, y: 54 },
    { x: 44, y: 54 },
    { x: 44, y: 40 },
  ],
  review: [
    { x: 5, y: 76 },
    { x: 33, y: 76 },
    { x: 33, y: 54 },
    { x: 63, y: 54 },
    { x: 63, y: 40 },
    { x: 76, y: 40 },
  ],
}

export const idleRoamRoutes: Record<AgentRole, Point[]> = {
  research: [
    { x: 17, y: 34 },
    { x: 12, y: 38 },
    { x: 22, y: 38 },
    { x: 17, y: 34 },
  ],
  plan: [
    { x: 20, y: 76 },
    { x: 14, y: 78 },
    { x: 26, y: 78 },
    { x: 20, y: 76 },
  ],
  code: [
    { x: 44, y: 34 },
    { x: 39, y: 38 },
    { x: 50, y: 38 },
    { x: 44, y: 34 },
  ],
  review: [
    { x: 76, y: 34 },
    { x: 70, y: 38 },
    { x: 82, y: 38 },
    { x: 76, y: 34 },
  ],
}

export const STORAGE_KEYS = {
  tasks: 'airi-studio.tasks',
  selectedTask: 'airi-studio.selected-task',
  nextTaskId: 'airi-studio.next-task-id',
  log: 'airi-studio.log',
  zoSessions: 'airi-studio.zo-sessions',
  selectedZoTaskId: 'airi-studio.selected-zo-task-id',
} as const

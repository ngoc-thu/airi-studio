import type { TaskPriority, TaskType } from '../types'

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (event: React.FormEvent) => void
  requestTitle: string
  setRequestTitle: (val: string) => void
  requestType: TaskType
  setRequestType: (val: TaskType) => void
  requestPriority: TaskPriority
  setRequestPriority: (val: TaskPriority) => void
  taskLabels: Record<TaskType, string>
  taskPriorityLabels: Record<TaskPriority, string>
}

export function TaskModal({
  isOpen,
  onClose,
  onSubmit,
  requestTitle,
  setRequestTitle,
  requestType,
  setRequestType,
  requestPriority,
  setRequestPriority,
  taskLabels,
  taskPriorityLabels,
}: TaskModalProps) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Create New Task</h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </div>

        <form className="modal-body" onSubmit={onSubmit}>
          <label className="intake-field">
            <span>Task Brief / Description</span>
            <textarea
              value={requestTitle}
              onChange={(e) => setRequestTitle(e.target.value)}
              placeholder="Describe what the agent needs to do..."
              rows={4}
              required
              autoFocus
            />
          </label>

          <div className="intake-row">
            <label className="intake-field">
              <span>Agent Role Required</span>
              <select
                value={requestType}
                onChange={(e) => setRequestType(e.target.value as TaskType)}
              >
                {Object.entries(taskLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="intake-field">
              <span>Task Priority</span>
              <select
                value={requestPriority}
                onChange={(e) => setRequestPriority(e.target.value as TaskPriority)}
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
            <button type="button" className="intake-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="intake-submit">
              Create task
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

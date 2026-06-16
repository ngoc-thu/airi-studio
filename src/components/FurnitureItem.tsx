import type { Furniture } from '../types'

interface FurnitureItemProps {
  item: Furniture
  onClick?: () => void
}

export function FurnitureItem({ item, onClick }: FurnitureItemProps) {
  const { label, desc, status, w, src } = item

  let glowColor = '#00f0ff'
  const lowerLabel = label.toLowerCase()
  if (
    lowerLabel.includes('shelf') || lowerLabel.includes('bookshelf') ||
    lowerLabel.includes('cabinet') || lowerLabel.includes('index') ||
    lowerLabel.includes('drawer') || lowerLabel.includes('document') ||
    lowerLabel.includes('reference') || lowerLabel.includes('research chair')
  ) {
    glowColor = '#00e5ff' // docs cyan
  } else if (
    lowerLabel.includes('couch') || lowerLabel.includes('coffee table') ||
    lowerLabel.includes('planning board')
  ) {
    glowColor = '#ff6ec7' // tasks magenta
  } else if (
    lowerLabel.includes('zoo left screen') || lowerLabel.includes('zoo center screen') ||
    lowerLabel.includes('zoo right screen') || lowerLabel.includes('zoo command') ||
    lowerLabel.includes('zoo primary terminal') || lowerLabel.includes('zoo node') ||
    lowerLabel.includes('zoo operator chair') ||
    lowerLabel.includes('zoo chat') || lowerLabel.includes('chat display') ||
    lowerLabel.includes('chat terminal') || lowerLabel.includes('chat desk') ||
    lowerLabel.includes('chat node') || lowerLabel.includes('chat operator')
  ) {
    glowColor = '#6eabff' // chat blue
  } else if (
    lowerLabel.includes('log') || lowerLabel.includes('ops') ||
    lowerLabel.includes('server')
  ) {
    glowColor = '#ffcb57' // logs yellow
  }

  return (
    <div
      className={`furniture-container${onClick ? ' interactive' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      } : undefined}
      style={{
        left: `${item.x}%`,
        top: `${item.y}%`,
        width: `${w}px`,
        '--glow-color': glowColor,
      } as React.CSSProperties}
    >
      <img
        src={src}
        alt={label}
        width={w}
        className="furniture"
        draggable={false}
        style={{
          display: 'block',
          width: '100%',
          height: 'auto',
          position: 'relative',
          transform: 'none',
          left: '0',
          top: '0',
        }}
      />
      <div className="furniture-info">
        <strong>{label}</strong>
        <small>{desc}</small>
        <div className="furniture-status-pill">
          <span>{status}</span>
        </div>
      </div>
    </div>
  )
}

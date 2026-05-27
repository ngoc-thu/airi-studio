import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import './App.css'

type Status = 'playing' | 'backlog' | 'completed' | 'paused'

type Game = {
  id: string
  title: string
  subtitle: string
  genre: string
  mood: string[]
  status: Status
  playtime: number
  rating: number
  favorite: boolean
  note: string
  lastPlayed?: string
  accent: string
}

const STORAGE_KEY = 'offline-game-vault-library'

const seedGames: Game[] = [
  {
    id: 'hollow-knight',
    title: 'Hollow Knight',
    subtitle: 'Hallownest calls again',
    genre: 'Metroidvania',
    mood: ['story', 'challenge'],
    status: 'playing',
    playtime: 21,
    rating: 5,
    favorite: true,
    note: 'Explore Crystal Peak next. Controller recommended.',
    lastPlayed: 'Today',
    accent: '#72c9dd',
  },
  {
    id: 'stardew-valley',
    title: 'Stardew Valley',
    subtitle: 'Autumn farm save',
    genre: 'Cozy sim',
    mood: ['chill', 'short'],
    status: 'playing',
    playtime: 64,
    rating: 5,
    favorite: true,
    note: 'Upgrade the barn before winter.',
    lastPlayed: 'Yesterday',
    accent: '#65d391',
  },
  {
    id: 'celeste',
    title: 'Celeste',
    subtitle: 'Climb one more screen',
    genre: 'Platformer',
    mood: ['challenge', 'short'],
    status: 'backlog',
    playtime: 0,
    rating: 0,
    favorite: false,
    note: 'Great candidate for a short weekend run.',
    accent: '#ff7190',
  },
  {
    id: 'disco-elysium',
    title: 'Disco Elysium',
    subtitle: 'The case is waiting',
    genre: 'Narrative RPG',
    mood: ['story'],
    status: 'paused',
    playtime: 12,
    rating: 4,
    favorite: false,
    note: 'Resume after reading the investigation log.',
    lastPlayed: '12 days ago',
    accent: '#f29957',
  },
  {
    id: 'a-short-hike',
    title: 'A Short Hike',
    subtitle: 'A quiet evening escape',
    genre: 'Adventure',
    mood: ['chill', 'short'],
    status: 'completed',
    playtime: 3,
    rating: 5,
    favorite: true,
    note: 'Finished. Perfect comfort replay.',
    lastPlayed: 'Last month',
    accent: '#ffc857',
  },
  {
    id: 'dead-cells',
    title: 'Dead Cells',
    subtitle: 'One quick run',
    genre: 'Roguelite',
    mood: ['action', 'challenge'],
    status: 'backlog',
    playtime: 4,
    rating: 0,
    favorite: false,
    note: 'Try with the custom mode unlocks.',
    accent: '#b975ff',
  },
]

const moods = ['all', 'chill', 'story', 'action', 'challenge', 'short'] as const
const statusLabels: Record<Status, string> = {
  playing: 'Playing',
  backlog: 'Backlog',
  completed: 'Completed',
  paused: 'Paused',
}

function loadGames() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) return seedGames

  try {
    return JSON.parse(saved) as Game[]
  } catch {
    return seedGames
  }
}

function App() {
  const [games, setGames] = useState<Game[]>(loadGames)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<Status | 'all'>('all')
  const [mood, setMood] = useState<(typeof moods)[number]>('all')
  const [selectedId, setSelectedId] = useState(seedGames[0].id)
  const [randomPick, setRandomPick] = useState<Game | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(games))
  }, [games])

  const filteredGames = useMemo(() => {
    const term = query.trim().toLowerCase()
    return games.filter((game) => {
      const matchesQuery =
        !term ||
        `${game.title} ${game.genre} ${game.note}`.toLowerCase().includes(term)
      const matchesStatus = status === 'all' || game.status === status
      const matchesMood = mood === 'all' || game.mood.includes(mood)
      return matchesQuery && matchesStatus && matchesMood
    })
  }, [games, mood, query, status])

  const selected = games.find((game) => game.id === selectedId) ?? games[0]
  const playing = games.find((game) => game.status === 'playing') ?? games[0]
  const totalPlaytime = games.reduce((total, game) => total + game.playtime, 0)
  const completedCount = games.filter((game) => game.status === 'completed').length
  const backlogCount = games.filter((game) => game.status === 'backlog').length

  function updateGame(id: string, patch: Partial<Game>) {
    setGames((library) =>
      library.map((game) => (game.id === id ? { ...game, ...patch } : game)),
    )
  }

  function chooseGame() {
    const pool = games.filter(
      (game) =>
        game.status !== 'completed' &&
        (mood === 'all' || game.mood.includes(mood)),
    )
    if (pool.length === 0) {
      setRandomPick(null)
      return
    }
    setRandomPick(pool[Math.floor(Math.random() * pool.length)])
  }

  function addGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const title = String(data.get('title')).trim()
    if (!title) return

    const newGame: Game = {
      id: `${title.toLowerCase().replace(/\W+/g, '-')}-${Date.now()}`,
      title,
      subtitle: 'Added to your offline shelf',
      genre: String(data.get('genre')).trim() || 'Indie',
      mood: [String(data.get('mood') || 'chill')],
      status: String(data.get('status')) as Status,
      playtime: 0,
      rating: 0,
      favorite: false,
      note: String(data.get('note')).trim() || 'Ready when you are.',
      accent: String(data.get('accent')),
    }

    setGames((library) => [newGame, ...library])
    setSelectedId(newGame.id)
    setFormOpen(false)
  }

  return (
    <div className="vault">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">OG</span>
          <div>
            <p className="eyebrow">Local library</p>
            <h1>Offline Game Vault</h1>
          </div>
        </div>
        <label className="search">
          <span>Search</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Titles, genres, notes..."
          />
        </label>
        <button className="primary-button" onClick={() => setFormOpen(true)}>
          + Add game
        </button>
      </header>

      <main className="layout">
        <aside className="sidebar">
          <p className="section-label">Browse</p>
          {(['all', 'playing', 'backlog', 'completed', 'paused'] as const).map(
            (option) => (
              <button
                className={status === option ? 'nav-item active' : 'nav-item'}
                key={option}
                onClick={() => setStatus(option)}
              >
                <span>{option === 'all' ? 'Library' : statusLabels[option]}</span>
                <small>
                  {option === 'all'
                    ? games.length
                    : games.filter((game) => game.status === option).length}
                </small>
              </button>
            ),
          )}
          <div className="divider" />
          <p className="section-label">Collections</p>
          <div className="collection"><span>Rainy Night</span><small>4</small></div>
          <div className="collection"><span>Controller Ready</span><small>8</small></div>
          <div className="collection"><span>Comfort Replays</span><small>3</small></div>
          <div className="storage">
            <p>OFFLINE STORAGE</p>
            <div className="storage-bar"><span /></div>
            <strong>146 GB</strong> <small>of 512 GB used</small>
          </div>
        </aside>

        <section className="content">
          <article className="featured" style={{ '--accent': playing.accent } as CSSProperties}>
            <div>
              <p className="eyebrow">Continue playing</p>
              <h2>{playing.title}</h2>
              <p>{playing.note}</p>
              <div className="feature-actions">
                <button className="play-button">Play offline</button>
                <button className="ghost-button" onClick={() => setSelectedId(playing.id)}>
                  Details
                </button>
              </div>
            </div>
            <div className="feature-progress">
              <span>{playing.playtime}h played</span>
              <strong>Last played {playing.lastPlayed?.toLowerCase()}</strong>
            </div>
          </article>

          <div className="stats">
            <Stat value={games.length} label="Games in vault" />
            <Stat value={backlogCount} label="In backlog" />
            <Stat value={completedCount} label="Completed" />
            <Stat value={`${totalPlaytime}h`} label="Total played" />
          </div>

          <section className="picker">
            <div>
              <p className="section-label">Tonight's queue</p>
              <h2>What should I play?</h2>
            </div>
            <div className="moods">
              {moods.map((option) => (
                <button
                  key={option}
                  className={mood === option ? 'chip selected' : 'chip'}
                  onClick={() => setMood(option)}
                >
                  {option}
                </button>
              ))}
            </div>
            <button className="random-button" onClick={chooseGame}>Random pick</button>
            {randomPick && (
              <button className="suggestion" onClick={() => setSelectedId(randomPick.id)}>
                Tonight: <strong>{randomPick.title}</strong> <span>View</span>
              </button>
            )}
          </section>

          <div className="shelf-title">
            <div>
              <p className="section-label">Your collection</p>
              <h2>{status === 'all' ? 'All offline games' : statusLabels[status]}</h2>
            </div>
            <span>{filteredGames.length} titles</span>
          </div>

          <div className="game-grid">
            {filteredGames.map((game) => (
              <button
                className={game.id === selected?.id ? 'game-card selected' : 'game-card'}
                key={game.id}
                onClick={() => setSelectedId(game.id)}
                style={{ '--accent': game.accent } as CSSProperties}
              >
                <div className="cover">
                  <span className="badge">{statusLabels[game.status]}</span>
                  {game.favorite && <span className="heart">+ fav</span>}
                  <strong>{game.title}</strong>
                </div>
                <div className="card-meta">
                  <strong>{game.title}</strong>
                  <span>{game.genre} / {game.playtime}h</span>
                </div>
              </button>
            ))}
            {filteredGames.length === 0 && (
              <p className="empty">No games match this shelf. Change the filters or add a title.</p>
            )}
          </div>
        </section>

        {selected && (
          <aside className="details" style={{ '--accent': selected.accent } as CSSProperties}>
            <div className="detail-cover">
              <span>{selected.genre}</span>
              <strong>{selected.title}</strong>
            </div>
            <p className="eyebrow">{statusLabels[selected.status]}</p>
            <h2>{selected.title}</h2>
            <p className="subtitle">{selected.subtitle}</p>
            <div className="detail-tags">
              {selected.mood.map((tag) => <span key={tag}>{tag}</span>)}
            </div>
            <dl>
              <div><dt>Playtime</dt><dd>{selected.playtime} hours</dd></div>
              <div><dt>Rating</dt><dd>{selected.rating ? `${selected.rating}/5` : 'Not rated'}</dd></div>
              <div><dt>Last played</dt><dd>{selected.lastPlayed ?? 'Never'}</dd></div>
            </dl>
            <p className="note">{selected.note}</p>
            <div className="detail-actions">
              <button
                className="ghost-button"
                onClick={() => updateGame(selected.id, { favorite: !selected.favorite })}
              >
                {selected.favorite ? 'Remove favorite' : 'Favorite'}
              </button>
              <button
                className="ghost-button"
                onClick={() => updateGame(selected.id, { status: 'completed' })}
              >
                Mark complete
              </button>
            </div>
          </aside>
        )}
      </main>

      {formOpen && (
        <div className="modal-backdrop" onMouseDown={() => setFormOpen(false)}>
          <form className="modal" onSubmit={addGame} onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <p className="eyebrow">Add to vault</p>
                <h2>New offline game</h2>
              </div>
              <button type="button" onClick={() => setFormOpen(false)}>Close</button>
            </div>
            <label>Title<input name="title" placeholder="Sea of Stars" required /></label>
            <div className="form-row">
              <label>Genre<input name="genre" placeholder="RPG" /></label>
              <label>Status
                <select name="status" defaultValue="backlog">
                  <option value="backlog">Backlog</option>
                  <option value="playing">Playing</option>
                  <option value="completed">Completed</option>
                  <option value="paused">Paused</option>
                </select>
              </label>
            </div>
            <div className="form-row">
              <label>Mood
                <select name="mood" defaultValue="chill">
                  {moods.slice(1).map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                </select>
              </label>
              <label>Cover color<input name="accent" type="color" defaultValue="#63dec6" /></label>
            </div>
            <label>Note<textarea name="note" placeholder="Why do you want to play this?" /></label>
            <button className="primary-button submit" type="submit">Add to library</button>
          </form>
        </div>
      )}
    </div>
  )
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

export default App

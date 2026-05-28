# Airi Studio

Airi Studio is a playable pixel management sim about coordinating a small team of anime-style AI agents through research, coding, review, and deploy work.

The current build is a browser-based React/Vite prototype. It focuses on the core game loop, the office layout, animated Codex Pets characters, and a lightweight resource system.

## Interface Preview

The main screen combines the task queue, pixel office board, agent roster, upgrade controls, and studio log in one management view.

![Airi Studio desktop interface](docs/airi-studio-interface.png)

The layout also adapts for narrow screens, stacking the dashboard, queue, office, and team panels for mobile browsing.

![Airi Studio mobile interface](docs/airi-studio-mobile.png)

## Gameplay

- Pick incoming tasks from the work queue.
- Assign each task to the agent that best matches the task type.
- Watch agents move from the inbox to their own work zones.
- Completed work earns credits.
- Failed work increases bug debt and reduces team mood.
- Spend credits to upgrade agent speed, accuracy, and focus.
- End the day to refresh the token budget and generate a new queue.

## Agents

The team currently uses four anime-style Codex Pets characters:

- Enana: Researcher for API mapping, source collection, and planning tasks.
- Chappy-chan: Coder for feature slices, UI fixes, and state wiring.
- Azuma: Reviewer for regression checks, edge cases, and PR review tasks.
- Ace Taffy: DevOps agent for previews, pipelines, deployment, and recovery tasks.

Selected source links are tracked in `public/pets/selected-anime-pets.json`.

## Office Layout

The playable office is arranged as a pixel studio with separate work areas:

- Inbox: task intake and movement starting point.
- Research Zone: planning table, monitors, board, and bookshelf.
- Code Zone: central workstation, terminals, screens, servers, and chair.
- Review Zone: board and review desk.
- Deploy Zone: rack, status screen, terminal, and deploy node.
- Lounge corner: couch, shelf, and coffee table for visual depth.

Characters move between the inbox and their assigned stations, then switch into working animations once they arrive.

## Visual Assets

Character sprites come from Codex Pets:

- `https://codex-pets.net/#/pets/enana`
- `https://codex-pets.net/#/pets/chappy-chan`
- `https://codexpets.net/gallery/azuma`
- `https://codexpets.net/gallery/ace-taffy`

Furniture, wall, and floor sprites are selected from SierraAssets' Pixel Art Furniture Pack on itch.io. The source page states the pack may be used in commercial and non-commercial games, but may not be resold as an asset pack or merchandise. A copy of the downloaded license file is stored at `public/furniture/LICENSE-sierrassets.txt`.

Some selected pets may be community or fan-inspired. Replace them with original anime-style assets before public or commercial deployment if licensing or brand safety becomes important.

## Tech Stack

- React 19
- TypeScript
- Vite
- CSS pixel-art layout and sprite animation
- Static assets served from `public/`

## Project Structure

```text
src/App.tsx                 Main game state, task loop, agents, stations
src/App.css                 Pixel office layout, UI panels, sprite animation
src/index.css               Global theme and base styles
public/pets/                Character sprites and source metadata
public/furniture/           Office furniture, wall, floor assets, license
public/favicon.svg          App favicon
```

## Development

```bash
npm install
npm run dev
```

The Vite dev server usually starts at `http://127.0.0.1:5173/`. If that port is busy, Vite will automatically choose the next available port.

## Verification

Run both checks before pushing changes:

```bash
npm run lint
npm run build
```

## Deployment

The repository is configured for static deployment on Vercel through the Vite build output.

- Repository: `https://github.com/ngoc-thu/airi-studio`
- Build command: `npm run build`
- Output directory: `dist`

## Roadmap

- Improve movement smoothing and sprite timing.
- Add more office furniture interactions.
- Add more task types and agent specialties.
- Add richer day-end summaries and team events.
- Add persistent save data for upgrades, day count, and office progress.

# AgentOps Studio

A playable pixel management sim about coordinating AI agents through research, coding, review and deploy work.

## MVP Loop

- Select incoming tasks from the queue.
- Assign each task to the best-fit agent.
- Watch agents process work at their stations.
- Completed work gives credits; failed work burns happiness and tokens.
- Spend credits to upgrade speed, accuracy and focus.
- End the day to refresh the token budget and generate a new queue.

## Current Scope

This prototype uses anime-style Codex Pet spritesheets for the agent characters:

- Enana from `https://codex-pets.net/#/pets/enana`
- Chappy-chan from `https://codex-pets.net/#/pets/chappy-chan`
- Azuma from `https://codexpets.net/gallery/azuma`
- Ace Taffy from `https://codexpets.net/gallery/ace-taffy`

The selected asset source list is stored in `public/pets/selected-anime-pets.json`. Some selected pets may be community/fan-inspired; keep that in mind before public or commercial deployment, and consider replacing them with original anime-style pets if needed.

Furniture, floor, and wall sprites are selected from SierraAssets' Pixel Art Furniture Pack on itch.io. The source page states the pack may be used in commercial and non-commercial games, but may not be resold as an asset pack or merchandise. A copy of the downloaded license file is stored at `public/furniture/LICENSE-sierrassets.txt`.

## Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm run lint
npm run build
```

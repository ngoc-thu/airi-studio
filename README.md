# Offline Game Vault

A local-first game library UI for a personal collection of offline games. Track backlog status, favorites, playtime, notes and pick what to play tonight by mood.

## Features

- Dark CRT-inspired responsive library dashboard
- Continue-playing hero, status shelves and collection statistics
- Search, status filters and mood-based random picker
- Detail panel with favorite and completion actions
- Add-game modal with local persistence through `localStorage`

This web edition catalogs games locally in the browser. Browsers cannot launch installed executables; a future Tauri desktop wrapper can add that capability.

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

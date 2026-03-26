# Preventivatore & Magazzino

Applicazione Electron per gestire preventivi e magazzino di prodotti. I dati sono salvati in file JSON locali.

## Caratteristiche principali

- Gestione prodotti con categorie, prezzi e note
- Gestione magazzino con quantita, soglie minime e avvisi
- Preventivi con calcolo automatico e stato (draft, inviato, accettato, rifiutato)

## Prerequisiti

- Node.js >= 16
- npm >= 8

## Installazione

```bash
cd Topino05
npm install
```

## Avvio

```bash
npm start
```

Questo comando:
1. Compila main, preload e renderer in `dist-ts/`
2. Avvia Electron caricando l'HTML locale

## Build per produzione

```bash
npm run build
```

## Struttura progetto (sintesi)

- `src/main/`: main process Electron e IPC
- `src/renderer/`: UI HTML/CSS/TS
- `public/`: template HTML base
- `tools/`: script di build

## Dati JSON

Percorso:
- `DBStorage/` nella root del progetto (condivisibile su GitHub)

File principali:
- `materials.json`
- `inventory.json`
- `articles.json`
- `orders.json`

## Troubleshooting

```bash
rm -r node_modules dist-ts
npm install
npm start
```

## Licenza

MIT

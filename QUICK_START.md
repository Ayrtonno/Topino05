# Guida Veloce di Avvio

## Setup Iniziale (Eseguire UNA SOLA VOLTA)

```bash
cd C:\Users\Krabbomibbo\Documents\Topino05
npm install --legacy-peer-deps
```

## Avvio dell'Applicazione

### Modalita Unificata (senza dev server separato)
```bash
npm start
```

Questo comando:
1. Compila main, preload e renderer in `dist-ts/`
2. Avvia Electron caricando l'HTML locale (nessun server esterno)

### Modalita Produzione
```bash
npm run build
```

## Verifica Installazione

Se l'app non parte, verifica:

1. Node.js installato:
   ```bash
   node --version
   npm --version
   ```

2. Dipendenze installate:
   ```bash
   ls node_modules | grep electron
   ```

3. Output generato:
   ```bash
   ls dist-ts
   ```

Se qualcosa manca, esegui:
```bash
rm -r node_modules package-lock.json
npm install --legacy-peer-deps
npm start
```

## Primo Utilizzo

1. Crea alcuni Prodotti (es: "Scheda Madre", "RAM", ecc.)
2. Aggiungi questi prodotti al Magazzino con quantita
3. Crea un Preventivo selezionando i prodotti

I dati verranno salvati automaticamente in file JSON.

## Dove si salvano i dati?

Windows: `%APPDATA%\Preventivatore Magazzino\data\`

Puoi trovare i file:
- `products.json`
- `inventory.json`
- `quotes.json`

## Troubleshooting

### Errore "Cannot find module"
```bash
npm install --legacy-peer-deps
```

### Ripristina da zero
```bash
rm -r node_modules dist-ts
npm install --legacy-peer-deps
npm start
```

---

Hai domande? Controlla il README per la documentazione completa.

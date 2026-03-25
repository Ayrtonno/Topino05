# 🚀 Guida Veloce di Avvio

## Setup Iniziale (Eseguire UNA SOLA VOLTA)

```bash
cd C:\Users\Krabbomibbo\Documents\Topino05
npm install --legacy-peer-deps
npx tsc
```

## Avvio dell'Applicazione

### Modalità Sviluppo (con dev server e hot reload)
```bash
npm run dev
```

Questo comando avvierà automaticamente:
1. Server React su `http://localhost:3000`
2. Applicazione Electron

### Modalità Produzione
```bash
npm run build
```

## ✅ Verifica Installazione

Se l'app non parte, verifica:

1. **Node.js installato:**
   ```bash
   node --version
   npm --version
   ```

2. **Dipendenze installate:**
   ```bash
   ls node_modules | grep electron
   ```

3. **Main process compilato:**
   ```bash
   ls dist/main/
   ```

Se qualcosa manca, esegui:
```bash
rm -r node_modules package-lock.json
npm install --legacy-peer-deps
npx tsc
npm run dev
```

## 🎯 Primo Utilizzo

1. Crea alcuni **Prodotti** (Es: "Scheda Madre", "RAM", ecc.)
2. Aggiungi questi prodotti al **Magazzino** con quantità
3. Crea un **Preventivo** selezionando i prodotti

I dati verranno salvati automaticamente in file JSON!

## 📁 Dove si salvano i dati?

Windows: `%APPDATA%\Preventivatore Magazzino\data\`

Puoi trovare i file:
- `products.json`
- `inventory.json`
- `quotes.json`

## ⚙️ Troubleshooting

### Errore "Cannot find module 'react-scripts'"
```bash
npm install --legacy-peer-deps
```

### L'app non carica React
1. Verifica che il server React stia utilizzando la porta 3000
2. Controlla console di Electron (F12)
3. Riavvia con `npm run dev`

### Ripristina da zero
```bash
rm -r node_modules dist
npm install --legacy-peer-deps
npx tsc
npm run dev
```

---

**Hai domande? Controlla il [README.md](./README.md) per la documentazione completa!**

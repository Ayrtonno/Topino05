# 📊 Preventivatore & Magazzino

Un'applicazione **Electron** per gestire preventivi e magazzino di prodotti. Tutto i dati sono salvati in file **JSON** locali per una gestione semplice e portabile.

## ✨ Caratteristiche

### 📦 **Gestione Prodotti**
- Aggiungi, modifica ed elimina prodotti
- Gerisci nome, descrizione, categoria e prezzo base
- Visualizzazione in tabella con ricerca rapida

### 🏭 **Gestione Magazzino**
- Traccia le quantità in stock di ogni prodotto
- Imposta quantità minima richiesta
- Avvisi automatici per articoli sotto stock
- Storico degli aggiornamenti

### 📄 **Gestione Preventivi**
- Crea preventivi professionali con articoli multipli
- Calcolo automatico di totali e sconti
- Gestione dello stato (draft, inviato, accettato, rifiutato)
- Note aggiuntive per cliente
- Visualizzazione dettagliata di ogni preventivo

## 🚀 Setup e Installazione

### Prerequisiti
- **Node.js** >= 16.x
- **npm** >= 8.x

### Installazione

1. **Clona il repository o naviga nella cartella del progetto**
```bash
cd Topino05
```

2. **Installa le dipendenze**
```bash
npm install
```

3. **Avvia l'app in modalità sviluppo**
```bash
npm run dev
```

Questo comando avvierà sia React dev server che Electron app contemporaneamente.

## 🏗️ Build per Produzione

```bash
npm run build
```

Questo comando:
1. Crea la build React ottimizzata
2. Compila il TypeScript del main process
3. Crea l'eseguibile Electron

## 📁 Struttura Progetto

```
Topino05/
├── src/
│   ├── main/                  # Main process di Electron
│   │   ├── index.ts          # Entry point principale
│   │   ├── store.ts          # Gestione file JSON
│   │   └── preload.ts        # Bridge IPC sicuro
│   └── renderer/              # Frontend React
│       ├── App.tsx            # Componente principale
│       ├── App.css            # Stili globali
│       ├── index.tsx          # React entry point
│       └── pages/
│           ├── ProductsPage.tsx
│           ├── InventoryPage.tsx
│           └── QuotesPage.tsx
├── public/
│   └── index.html            # HTML template
├── package.json
├── tsconfig.json
└── README.md
```

## 💾 Struttura Dati JSON

I dati vengono salvati nella cartella user data di Electron:
- **Windows**: `%APPDATA%/Preventivatore Magazzino/data/`
- **macOS**: `~/Library/Application Support/Preventivatore Magazzino/data/`
- **Linux**: `~/.config/Preventivatore Magazzino/data/`

### File Principali

**products.json**
```json
[
  {
    "id": "1234567890",
    "name": "Scheda Madre",
    "description": "ASUS ROG STRIX",
    "basePrice": 250.00,
    "category": "Hardware"
  }
]
```

**inventory.json**
```json
[
  {
    "productId": "1234567890",
    "quantity": 15,
    "minQuantity": 5,
    "lastUpdated": "2024-01-15T10:30:00Z"
  }
]
```

**quotes.json**
```json
[
  {
    "id": "9876543210",
    "clientName": "Acme Corporation",
    "clientEmail": "info@acme.com",
    "items": [
      {
        "productId": "1234567890",
        "quantity": 2,
        "unitPrice": 250.00
      }
    ],
    "totalAmount": 500.00,
    "discount": 10,
    "finalAmount": 450.00,
    "createdAt": "2024-01-15T10:30:00Z",
    "status": "draft",
    "notes": "Pagamento a 30 giorni"
  }
]
```

## 📋 Guida Utilizzo

### Gestione Prodotti
1. Accedi alla sezione **"📦 Prodotti"**
2. Clicca su **"➕ Nuovo Prodotto"**
3. Compila il form con i dati del prodotto
4. Clicca **"Salva"**
5. Per modificare: clicca **"✏️ Modifica"** sulla riga del prodotto
6. Per eliminare: clicca **"🗑️ Elimina"**

### Gestione Magazzino
1. Accedi alla sezione **"🏭 Magazzino"**
2. Aggiungi articoli impostando quantità e minimo
3. L'app avviserà automaticamente se la quantità scende sotto il minimo (viene evidenziata in giallo)
4. Modifica o elimina articoli come nella sezione prodotti

### Creazione Preventivi
1. Accedi alla sezione **"📄 Preventivi"**
2. Clicca su **"➕ Nuovo Preventivo"**
3. Inserisci i dati del cliente
4. Aggiungi articoli selezionandoli dal catalogo
5. I prezzi si riempiono automaticamente dal catalogo prodotti
6. Applica uno sconto percentuale se necessario
7. Clicca **"Salva Preventivo"**
8. Visualizza il preventivo completo cliccando **"👁️ Visualizza"**
9. Cambia lo stato del preventivo (draft → inviato → accettato/rifiutato)

## 🎨 Personalizzazione

### Colori
Modifica il gradiente del header in `src/renderer/App.css`:
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Aggiungi nuove categorie di prodotti
Le categorie sono personalizzabili: digita qualsiasi valore nel campo "Categoria"

## 🔧 Risoluzione Problemi

### L'app non parte
```bash
# Cancella node_modules e reinstalla
rm -r node_modules
npm install
npm run dev
```

### Errore "Cannot find module"
```bash
npm install
```

### I dati non si salvano
- Verifica che la cartella `%APPDATA%/data/` sia scrivibile
- Controlla la console di sviluppo (F12) per errori

## 📝 Licenza

MIT

## 🤝 Supporto

Per problemi o suggerimenti, apri una issue nel progetto.

---

**Creato con ❤️ per la gestione semplice e intuitiva di preventivi e magazzino**

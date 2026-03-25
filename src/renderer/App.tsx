import React, { useState } from 'react';
import './App.css';
import ProductsPage from './pages/ProductsPage';
import InventoryPage from './pages/InventoryPage';
import QuotesPage from './pages/QuotesPage';

type Page = 'products' | 'inventory' | 'quotes';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('products');

  return (
    <div className="app">
      <header className="header">
        <h1>📊 Preventivatore & Magazzino</h1>
        <nav className="nav">
          <button
            className={`nav-btn ${currentPage === 'products' ? 'active' : ''}`}
            onClick={() => setCurrentPage('products')}
          >
            📦 Prodotti
          </button>
          <button
            className={`nav-btn ${currentPage === 'inventory' ? 'active' : ''}`}
            onClick={() => setCurrentPage('inventory')}
          >
            🏭 Magazzino
          </button>
          <button
            className={`nav-btn ${currentPage === 'quotes' ? 'active' : ''}`}
            onClick={() => setCurrentPage('quotes')}
          >
            📄 Preventivi
          </button>
        </nav>
      </header>

      <main className="main-content">
        {currentPage === 'products' && <ProductsPage />}
        {currentPage === 'inventory' && <InventoryPage />}
        {currentPage === 'quotes' && <QuotesPage />}
      </main>
    </div>
  );
}

export default App;

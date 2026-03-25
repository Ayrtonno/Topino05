import React, { useState } from 'react';
import './App.css';
import { MaterialsPage } from './pages/MaterialsPage';
import { ColorsPage } from './pages/ColorsPage';
import { ArticlesPage } from './pages/ArticlesPage';
import { OrdersPage } from './pages/OrdersPage';
import { DashboardPage } from './pages/DashboardPage';

type Page = 'dashboard' | 'materials' | 'colors' | 'articles' | 'orders';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  return (
    <div className="app">
      <header className="header">
        <h1>🏭 Magazzino & Preventivatore</h1>
        <nav className="nav">
          <button
            className={`nav-btn ${currentPage === 'dashboard' ? 'active' : ''}`}
            onClick={() => setCurrentPage('dashboard')}
          >
            📊 Dashboard
          </button>
          <button
            className={`nav-btn ${currentPage === 'materials' ? 'active' : ''}`}
            onClick={() => setCurrentPage('materials')}
          >
            📋 Materia Prima
          </button>
          <button
            className={`nav-btn ${currentPage === 'colors' ? 'active' : ''}`}
            onClick={() => setCurrentPage('colors')}
          >
            🎨 Colori
          </button>
          <button
            className={`nav-btn ${currentPage === 'articles' ? 'active' : ''}`}
            onClick={() => setCurrentPage('articles')}
          >
            📦 Articoli
          </button>
          <button
            className={`nav-btn ${currentPage === 'orders' ? 'active' : ''}`}
            onClick={() => setCurrentPage('orders')}
          >
            📄 Ordini
          </button>
        </nav>
      </header>

      <main className="main-content">
        {currentPage === 'dashboard' && <DashboardPage />}
        {currentPage === 'materials' && <MaterialsPage />}
        {currentPage === 'colors' && <ColorsPage />}
        {currentPage === 'articles' && <ArticlesPage />}
        {currentPage === 'orders' && <OrdersPage />}
      </main>
    </div>
  );
}

export default App;

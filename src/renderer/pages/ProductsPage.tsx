import React, { useState, useEffect } from 'react';

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    basePrice: 0,
    category: '',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await window.api.getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
      setMessage({ type: 'error', text: 'Errore nel caricamento dei prodotti' });
    }
  };

  const handleAddProduct = () => {
    setEditingId(null);
    setFormData({ name: '', description: '', basePrice: 0, category: '' });
    setShowForm(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      description: product.description,
      basePrice: product.basePrice,
      category: product.category,
    });
    setShowForm(true);
  };

  const handleSaveProduct = async () => {
    if (!formData.name || formData.basePrice <= 0) {
      setMessage({ type: 'error', text: 'Nome e prezzo sono obbligatori' });
      return;
    }

    let updatedProducts = [...products];

    if (editingId) {
      updatedProducts = updatedProducts.map((p) =>
        p.id === editingId
          ? { ...p, ...formData }
          : p
      );
      setMessage({ type: 'success', text: 'Prodotto modificato con successo' });
    } else {
      const newProduct: Product = {
        id: Date.now().toString(),
        ...formData,
      };
      updatedProducts.push(newProduct);
      setMessage({ type: 'success', text: 'Prodotto aggiunto con successo' });
    }

    try {
      await window.api.saveProducts(updatedProducts);
      setProducts(updatedProducts);
      setShowForm(false);
    } catch (error) {
      setMessage({ type: 'error', text: 'Errore nel salvataggio' });
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('Sei sicuro di voler eliminare questo prodotto?')) {
      const updatedProducts = products.filter((p) => p.id !== id);
      try {
        await window.api.saveProducts(updatedProducts);
        setProducts(updatedProducts);
        setMessage({ type: 'success', text: 'Prodotto eliminato con successo' });
      } catch (error) {
        setMessage({ type: 'error', text: 'Errore nell\'eliminazione' });
      }
    }
  };

  return (
    <div>
      <div className="section-title">📦 Gestione Prodotti</div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
          <button
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}
            onClick={() => setMessage(null)}
          >
            ✕
          </button>
        </div>
      )}

      <div className="btn-group">
        <button className="btn btn-primary" onClick={handleAddProduct}>
          ➕ Nuovo Prodotto
        </button>
      </div>

      {showForm && (
        <div className="modal" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              {editingId ? 'Modifica Prodotto' : 'Nuovo Prodotto'}
            </div>

            <div className="form-group">
              <label>Nome Prodotto *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Es. Scheda Madre"
              />
            </div>

            <div className="form-group">
              <label>Categoria</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Es. Hardware"
              />
            </div>

            <div className="form-group">
              <label>Prezzo Base (€) *</label>
              <input
                type="number"
                step="0.01"
                value={formData.basePrice}
                onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) })}
                placeholder="0.00"
              />
            </div>

            <div className="form-group">
              <label>Descrizione</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrizione del prodotto..."
              />
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>
                Annulla
              </button>
              <button className="btn btn-primary" onClick={handleSaveProduct}>
                Salva
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container">
        {products.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#999' }}>Nessun prodotto. Creane uno per iniziare!</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Categoria</th>
                <th>Prezzo</th>
                <th>Descrizione</th>
                <th style={{ width: '150px' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>{product.name}</td>
                  <td>{product.category || '-'}</td>
                  <td>€ {product.basePrice.toFixed(2)}</td>
                  <td>{product.description}</td>
                  <td>
                    <button
                      className="btn btn-secondary btn-small"
                      onClick={() => handleEditProduct(product)}
                    >
                      ✏️ Modifica
                    </button>
                    <button
                      className="btn btn-danger btn-small"
                      onClick={() => handleDeleteProduct(product.id)}
                      style={{ marginLeft: '5px' }}
                    >
                      🗑️ Elimina
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ProductsPage;

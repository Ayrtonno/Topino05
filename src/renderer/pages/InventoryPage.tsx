import React, { useState, useEffect } from 'react';

const InventoryPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    productId: '',
    quantity: 0,
    minQuantity: 0,
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const productsData = await window.api.getProducts();
      const inventoryData = await window.api.getInventory();
      setProducts(productsData);
      setInventory(inventoryData);
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: 'Errore nel caricamento dei dati' });
    }
  };

  const handleAddInventory = () => {
    setEditingProductId(null);
    setFormData({ productId: '', quantity: 0, minQuantity: 0 });
    setShowForm(true);
  };

  const handleEditInventory = (item: InventoryItem) => {
    setEditingProductId(item.productId);
    setFormData({
      productId: item.productId,
      quantity: item.quantity,
      minQuantity: item.minQuantity,
    });
    setShowForm(true);
  };

  const handleSaveInventory = async () => {
    if (!formData.productId) {
      setMessage({ type: 'error', text: 'Seleziona un prodotto' });
      return;
    }

    let updatedInventory = [...inventory];

    if (editingProductId) {
      updatedInventory = updatedInventory.map((item) =>
        item.productId === editingProductId
          ? { ...item, ...formData, lastUpdated: new Date().toISOString() }
          : item
      );
    } else {
      const newItem: InventoryItem = {
        ...formData,
        lastUpdated: new Date().toISOString(),
      };
      updatedInventory.push(newItem);
    }

    try {
      await window.api.saveInventory(updatedInventory);
      setInventory(updatedInventory);
      setShowForm(false);
      setMessage({
        type: 'success',
        text: editingProductId ? 'Inventario modificato' : 'Inventario aggiunto',
      });
    } catch (error) {
      setMessage({ type: 'error', text: 'Errore nel salvataggio' });
    }
  };

  const handleDeleteInventory = async (productId: string) => {
    if (window.confirm('Eliminare questo articolo dal magazzino?')) {
      const updatedInventory = inventory.filter((item) => item.productId !== productId);
      try {
        await window.api.saveInventory(updatedInventory);
        setInventory(updatedInventory);
        setMessage({ type: 'success', text: 'Articolo rimosso dal magazzino' });
      } catch (error) {
        setMessage({ type: 'error', text: 'Errore nell\'eliminazione' });
      }
    }
  };

  const getProductName = (productId: string) => {
    return products.find((p) => p.id === productId)?.name || 'Prodotto sconosciuto';
  };

  const getAvailableProducts = () => {
    const inventoryProductIds = inventory.map((item) => item.productId);
    return products.filter((p) => !inventoryProductIds.includes(p.id) || editingProductId === p.id);
  };

  const getLowStockItems = () => {
    return inventory.filter((item) => item.quantity <= item.minQuantity);
  };

  return (
    <div>
      <div className="section-title">🏭 Gestione Magazzino</div>

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

      {getLowStockItems().length > 0 && (
        <div className="alert alert-info">
          ⚠️ {getLowStockItems().length} articolo(i) sotto la quantità minima!
        </div>
      )}

      <div className="btn-group">
        <button className="btn btn-primary" onClick={handleAddInventory}>
          ➕ Nuovo Articolo
        </button>
      </div>

      {showForm && (
        <div className="modal" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              {editingProductId ? 'Modifica Inventario' : 'Nuovo Articolo'}
            </div>

            <div className="form-group">
              <label>Prodotto *</label>
              <select
                value={formData.productId}
                onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
              >
                <option value="">-- Seleziona un prodotto --</option>
                {getAvailableProducts().map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Quantità in Stock *</label>
              <input
                type="number"
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label>Quantità Minima *</label>
              <input
                type="number"
                min="0"
                value={formData.minQuantity}
                onChange={(e) => setFormData({ ...formData, minQuantity: parseInt(e.target.value) })}
              />
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>
                Annulla
              </button>
              <button className="btn btn-primary" onClick={handleSaveInventory}>
                Salva
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container">
        {inventory.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#999' }}>Nessun articolo in magazzino</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Prodotto</th>
                <th>Quantità</th>
                <th>Min Richiesta</th>
                <th style={{ color: 'red' }}>Stato</th>
                <th>Ultimo Aggiornamento</th>
                <th style={{ width: '150px' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => {
                const isLowStock = item.quantity <= item.minQuantity;
                return (
                  <tr key={item.productId} style={{ backgroundColor: isLowStock ? '#fff3cd' : '' }}>
                    <td>{getProductName(item.productId)}</td>
                    <td>{item.quantity}</td>
                    <td>{item.minQuantity}</td>
                    <td>
                      {isLowStock ? (
                        <span style={{ color: 'red', fontWeight: 'bold' }}>⚠️ Basso</span>
                      ) : (
                        <span style={{ color: 'green' }}>✓ OK</span>
                      )}
                    </td>
                    <td>{new Date(item.lastUpdated).toLocaleDateString('it-IT')}</td>
                    <td>
                      <button
                        className="btn btn-secondary btn-small"
                        onClick={() => handleEditInventory(item)}
                      >
                        ✏️ Modifica
                      </button>
                      <button
                        className="btn btn-danger btn-small"
                        onClick={() => handleDeleteInventory(item.productId)}
                        style={{ marginLeft: '5px' }}
                      >
                        🗑️ Elimina
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default InventoryPage;

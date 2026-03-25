import React, { useState, useEffect } from 'react';

const QuotesPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    discount: 0,
    notes: '',
    items: [] as QuoteItem[],
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const productsData = await window.api.getProducts();
      const quotesData = await window.api.getQuotes();
      setProducts(productsData);
      setQuotes(quotesData);
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: 'Errore nel caricamento dei dati' });
    }
  };

  const handleNewQuote = () => {
    setEditingId(null);
    setSelectedQuote(null);
    setFormData({
      clientName: '',
      clientEmail: '',
      discount: 0,
      notes: '',
      items: [],
    });
    setShowForm(true);
  };

  const handleEditQuote = (quote: Quote) => {
    setEditingId(quote.id);
    setFormData({
      clientName: quote.clientName,
      clientEmail: quote.clientEmail,
      discount: quote.discount,
      notes: quote.notes,
      items: [...quote.items],
    });
    setShowForm(true);
    setSelectedQuote(null);
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { productId: '', quantity: 1, unitPrice: 0 }],
    });
  };

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    if (field === 'productId') {
      const product = products.find((p) => p.id === value);
      newItems[index] = {
        ...newItems[index],
        productId: value,
        unitPrice: product?.basePrice || 0,
      };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setFormData({ ...formData, items: newItems });
  };

  const calculateTotal = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const discount = (subtotal * formData.discount) / 100;
    return { subtotal, discount, total: subtotal - discount };
  };

  const handleSaveQuote = async () => {
    if (!formData.clientName || formData.items.length === 0) {
      setMessage({ type: 'error', text: 'Nome cliente e almeno un articolo sono obbligatori' });
      return;
    }

    const { total, discount: discountAmount } = calculateTotal();
    const subtotal = formData.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    let updatedQuotes = [...quotes];

    if (editingId) {
      updatedQuotes = updatedQuotes.map((q) =>
        q.id === editingId
          ? {
              ...q,
              clientName: formData.clientName,
              clientEmail: formData.clientEmail,
              items: formData.items,
              totalAmount: subtotal,
              discount: formData.discount,
              finalAmount: total,
              notes: formData.notes,
            }
          : q
      );
    } else {
      const newQuote: Quote = {
        id: Date.now().toString(),
        clientName: formData.clientName,
        clientEmail: formData.clientEmail,
        items: formData.items,
        totalAmount: subtotal,
        discount: formData.discount,
        finalAmount: total,
        notes: formData.notes,
        createdAt: new Date().toISOString(),
        status: 'draft',
      };
      updatedQuotes.push(newQuote);
    }

    try {
      await window.api.saveQuotes(updatedQuotes);
      setQuotes(updatedQuotes);
      setShowForm(false);
      setMessage({ type: 'success', text: editingId ? 'Preventivo modificato' : 'Preventivo creato' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Errore nel salvataggio' });
    }
  };

  const handleDeleteQuote = async (id: string) => {
    if (window.confirm('Eliminare questo preventivo?')) {
      const updatedQuotes = quotes.filter((q) => q.id !== id);
      try {
        await window.api.saveQuotes(updatedQuotes);
        setQuotes(updatedQuotes);
        setMessage({ type: 'success', text: 'Preventivo eliminato' });
      } catch (error) {
        setMessage({ type: 'error', text: 'Errore nell\'eliminazione' });
      }
    }
  };

  const handleStatusChange = async (id: string, newStatus: Quote['status']) => {
    const updatedQuotes = quotes.map((q) =>
      q.id === id ? { ...q, status: newStatus } : q
    );
    try {
      await window.api.saveQuotes(updatedQuotes);
      setQuotes(updatedQuotes);
      setMessage({ type: 'success', text: 'Stato aggiornato' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Errore nell\'aggiornamento' });
    }
  };

  const getStatusColor = (status: Quote['status']) => {
    switch (status) {
      case 'draft':
        return '#999';
      case 'sent':
        return '#0066cc';
      case 'accepted':
        return '#009900';
      case 'rejected':
        return '#cc0000';
      default:
        return '#000';
    }
  };

  const getProductName = (productId: string) => {
    return products.find((p) => p.id === productId)?.name || 'Prodotto sconosciuto';
  };

  const { subtotal, discount: discountAmount, total } = calculateTotal();

  return (
    <div>
      <div className="section-title">📄 Gestione Preventivi</div>

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
        <button className="btn btn-primary" onClick={handleNewQuote}>
          ➕ Nuovo Preventivo
        </button>
      </div>

      {showForm && (
        <div className="modal" onClick={() => setShowForm(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '700px', maxHeight: '90vh' }}
          >
            <div className="modal-header">
              {editingId ? 'Modifica Preventivo' : 'Nuovo Preventivo'}
            </div>

            <div className="form-group">
              <label>Nome Cliente *</label>
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                placeholder="Es. Acme Corporation"
              />
            </div>

            <div className="form-group">
              <label>Email Cliente</label>
              <input
                type="email"
                value={formData.clientEmail}
                onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                placeholder="cliente@esempio.com"
              />
            </div>

            <div className="form-group">
              <label>Articoli *</label>
              <button
                className="btn btn-secondary btn-small"
                onClick={handleAddItem}
                style={{ marginBottom: '10px' }}
              >
                ➕ Aggiungi Articolo
              </button>

              {formData.items.length === 0 ? (
                <p style={{ color: '#999', fontSize: '14px' }}>Nessun articolo. Aggiungine uno!</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ marginBottom: '10px' }}>
                    <thead>
                      <tr>
                        <th>Prodotto</th>
                        <th>Quantità</th>
                        <th>Prezzo Unitario</th>
                        <th>Totale</th>
                        <th>Azione</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((item, index) => (
                        <tr key={index}>
                          <td>
                            <select
                              value={item.productId}
                              onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                              style={{ width: '100%' }}
                            >
                              <option value="">-- Seleziona --</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                handleItemChange(index, 'quantity', parseInt(e.target.value))
                              }
                              style={{ width: '80px' }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) =>
                                handleItemChange(index, 'unitPrice', parseFloat(e.target.value))
                              }
                              style={{ width: '100px' }}
                            />
                          </td>
                          <td>€ {(item.quantity * item.unitPrice).toFixed(2)}</td>
                          <td>
                            <button
                              className="btn btn-danger btn-small"
                              onClick={() => handleRemoveItem(index)}
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '4px', marginBottom: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Subtotale:</span>
                <strong>€ {subtotal.toFixed(2)}</strong>
              </div>
              <div className="form-group">
                <label>Sconto (%) </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) })}
                  style={{ width: '100px' }}
                />
              </div>
              {formData.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#009900' }}>
                  <span>Sconto:</span>
                  <strong>-€ {discountAmount.toFixed(2)}</strong>
                </div>
              )}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '10px',
                  borderTop: '2px solid #ddd',
                  fontSize: '16px',
                  fontWeight: 'bold',
                }}
              >
                <span>Totale:</span>
                <span>€ {total.toFixed(2)}</span>
              </div>
            </div>

            <div className="form-group">
              <label>Note</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Note aggiuntive..."
              />
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>
                Annulla
              </button>
              <button className="btn btn-primary" onClick={handleSaveQuote}>
                Salva Preventivo
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container">
        {selectedQuote && (
          <div style={{ marginBottom: '20px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setSelectedQuote(null)}
              style={{ marginBottom: '15px' }}
            >
              ← Torna alle preventivi
            </button>
            <div
              style={{
                backgroundColor: '#f8f9fa',
                padding: '20px',
                borderRadius: '6px',
                border: '1px solid #ddd',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ fontSize: '14px', color: '#999', marginBottom: '5px' }}>Cliente</h3>
                  <p style={{ fontSize: '16px', fontWeight: 'bold' }}>{selectedQuote.clientName}</p>
                  <p style={{ fontSize: '13px', color: '#666' }}>{selectedQuote.clientEmail}</p>
                </div>
                <div>
                  <h3 style={{ fontSize: '14px', color: '#999', marginBottom: '5px' }}>Data</h3>
                  <p style={{ fontSize: '16px', fontWeight: 'bold' }}>
                    {new Date(selectedQuote.createdAt).toLocaleDateString('it-IT')}
                  </p>
                </div>
              </div>

              <table className="table" style={{ marginBottom: '20px' }}>
                <thead>
                  <tr>
                    <th>Prodotto</th>
                    <th>Quantità</th>
                    <th>Prezzo Unitario</th>
                    <th>Totale</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedQuote.items.map((item, index) => (
                    <tr key={index}>
                      <td>{getProductName(item.productId)}</td>
                      <td>{item.quantity}</td>
                      <td>€ {item.unitPrice.toFixed(2)}</td>
                      <td>€ {(item.quantity * item.unitPrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  backgroundColor: '#fff3cd',
                  padding: '15px',
                  borderRadius: '4px',
                  marginBottom: '15px',
                }}
              >
                <div>
                  <div style={{ marginBottom: '8px' }}>
                    <span>Subtotale: </span>
                    <strong>€ {selectedQuote.totalAmount.toFixed(2)}</strong>
                  </div>
                  {selectedQuote.discount > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                      <span>Sconto ({selectedQuote.discount}%): </span>
                      <strong>-€ {(selectedQuote.totalAmount * (selectedQuote.discount / 100)).toFixed(2)}</strong>
                    </div>
                  )}
                  <div style={{ fontSize: '16px', fontWeight: 'bold', borderTop: '1px solid #ffc107', paddingTop: '8px' }}>
                    <span>Totale: </span>
                    <strong>€ {selectedQuote.finalAmount.toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              {selectedQuote.notes && (
                <div style={{ marginBottom: '15px' }}>
                  <p style={{ fontSize: '14px', color: '#999' }}>Note:</p>
                  <p>{selectedQuote.notes}</p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary btn-small"
                  onClick={() => handleEditQuote(selectedQuote)}
                >
                  ✏️ Modifica
                </button>
                <select
                  value={selectedQuote.status}
                  onChange={(e) => handleStatusChange(selectedQuote.id, e.target.value as Quote['status'])}
                  style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ddd' }}
                >
                  <option value="draft">📝 Draft</option>
                  <option value="sent">📤 Inviato</option>
                  <option value="accepted">✅ Accettato</option>
                  <option value="rejected">❌ Rifiutato</option>
                </select>
                <button
                  className="btn btn-danger btn-small"
                  onClick={() => {
                    handleDeleteQuote(selectedQuote.id);
                    setSelectedQuote(null);
                  }}
                >
                  🗑️ Elimina
                </button>
              </div>
            </div>
          </div>
        )}

        {!selectedQuote && (
          <>
            {quotes.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#999' }}>Nessun preventivo. Creane uno!</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Email</th>
                    <th>Data</th>
                    <th>Importo</th>
                    <th>Stato</th>
                    <th style={{ width: '180px' }}>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((quote) => (
                    <tr key={quote.id}>
                      <td>{quote.clientName}</td>
                      <td>{quote.clientEmail || '-'}</td>
                      <td>{new Date(quote.createdAt).toLocaleDateString('it-IT')}</td>
                      <td>€ {quote.finalAmount.toFixed(2)}</td>
                      <td>
                        <span style={{ color: getStatusColor(quote.status), fontWeight: 'bold' }}>
                          {quote.status === 'draft' && '📝 Draft'}
                          {quote.status === 'sent' && '📤 Inviato'}
                          {quote.status === 'accepted' && '✅ Accettato'}
                          {quote.status === 'rejected' && '❌ Rifiutato'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-small"
                          onClick={() => setSelectedQuote(quote)}
                        >
                          👁️ Visualizza
                        </button>
                        <button
                          className="btn btn-danger btn-small"
                          onClick={() => handleDeleteQuote(quote.id)}
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
          </>
        )}
      </div>
    </div>
  );
};

export default QuotesPage;

import React, { useState, useEffect } from "react";
import "../styles/Page.css";

interface OrderItem {
    articleId: string;
    quantity: number;
    unitPrice: number;
}

interface Order {
    id: string;
    clientName: string;
    clientEmail?: string;
    items: OrderItem[];
    materialCost: number;
    laborCost: number;
    discountPercentage: number;
    finalAmount: number;
    createdAt: string;
    status: "draft" | "sent" | "accepted" | "rejected" | "completed";
    notes?: string;
}

interface Article {
    id: string;
    code: string;
    name: string;
    composition: any[];
    laborHoursRequired: number;
    marginPercentage: number | 0;
}

interface Material {
    id: string;
    name: string;
    costPerGramm: number;
}

interface Color {
    id: string;
    materialId: string;
    colorName: string;
    stockInGramms: number;
}

interface LaborConfig {
    hourlyRate: number;
}

export const OrdersPage: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [articles, setArticles] = useState<Article[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [colors, setColors] = useState<Color[]>([]);
    const [laborConfig, setLaborConfig] = useState<LaborConfig>({ hourlyRate: 4 });
    const [showForm, setShowForm] = useState(false);
    const [showDetails, setShowDetails] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Order>>({
        clientName: "",
        clientEmail: "",
        items: [],
        discountPercentage: 0,
        status: "draft",
        notes: "",
    });
    const [currentItem, setCurrentItem] = useState<Partial<OrderItem>>({
        articleId: "",
        quantity: 1,
        unitPrice: 0,
    });
    const [message, setMessage] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const ordersData = await window.api.getOrders();
            const articlesData = await window.api.getArticles();
            const materialsData = await window.api.getMaterials();
            const colorsData = await window.api.getColors();
            const configData = await window.api.getLaborConfig();

            setOrders(ordersData);
            setArticles(articlesData);
            setMaterials(materialsData);
            setColors(colorsData);
            setLaborConfig(configData);
        } catch (error) {
            setMessage("Errore nel caricamento dei dati");
        }
    };

    const calculateArticlePrice = (article: Article): number => {
        let materialCost = 0;
        for (const comp of article.composition) {
            const material = materials.find((m) => m.id === comp.materialId);
            if (material) {
                materialCost += material.costPerGramm * comp.quantityGramms;
            }
        }

        const laborCost = article.laborHoursRequired * laborConfig.hourlyRate;
        const totalCost = materialCost + laborCost;
        const finalPrice = totalCost * (1 + article.marginPercentage / 100);

        return parseFloat(finalPrice.toFixed(2));
    };

    const addItem = () => {
        if (!currentItem.articleId || !currentItem.quantity) {
            setMessage("Seleziona articolo e quantità");
            return;
        }

        const article = articles.find((a) => a.id === currentItem.articleId);
        if (!article) return;

        const unitPrice = calculateArticlePrice(article);
        const newItem: OrderItem = {
            articleId: currentItem.articleId!,
            quantity: currentItem.quantity!,
            unitPrice: unitPrice,
        };

        setFormData({
            ...formData,
            items: [...(formData.items || []), newItem],
        });

        setCurrentItem({
            articleId: "",
            quantity: 1,
            unitPrice: 0,
        });

        setMessage("Articolo aggiunto!");
        setTimeout(() => setMessage(""), 2000);
    };

    const removeItem = (index: number) => {
        const newItems = (formData.items || []).filter((_, i) => i !== index);
        setFormData({
            ...formData,
            items: newItems,
        });
    };

    const calculateOrderCosts = (items: OrderItem[], discount: number) => {
        let materialCost = 0;
        let laborCost = 0;

        for (const item of items) {
            const article = articles.find((a) => a.id === item.articleId);
            if (!article) continue;

            // Calculate material cost
            for (const comp of article.composition) {
                const material = materials.find((m) => m.id === comp.materialId);
                if (material) {
                    materialCost += material.costPerGramm * comp.quantityGramms * item.quantity;
                }
            }

            // Calculate labor cost
            laborCost += article.laborHoursRequired * laborConfig.hourlyRate * item.quantity;
        }

        const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
        const discountAmount = subtotal * (discount / 100);
        const finalAmount = subtotal - discountAmount;

        return {
            materialCost: parseFloat(materialCost.toFixed(2)),
            laborCost: parseFloat(laborCost.toFixed(2)),
            finalAmount: parseFloat(finalAmount.toFixed(2)),
        };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.clientName || !formData.items || formData.items.length === 0) {
            setMessage("Completa i campi obbligatori");
            return;
        }

        const costs = calculateOrderCosts(formData.items, formData.discountPercentage || 0);
        let updatedOrders: Order[];

        if (editingId) {
            updatedOrders = orders.map((o) =>
                o.id === editingId
                    ? {
                          ...formData,
                          id: o.id,
                          createdAt: o.createdAt,
                          ...costs,
                      } as Order
                    : o
            );
        } else {
            const newOrder: Order = {
                id: Date.now().toString(),
                clientName: formData.clientName!,
                clientEmail: formData.clientEmail,
                items: formData.items,
                materialCost: costs.materialCost,
                laborCost: costs.laborCost,
                finalAmount: costs.finalAmount,
                discountPercentage: formData.discountPercentage || 0,
                status: formData.status as any,
                notes: formData.notes,
                createdAt: new Date().toISOString(),
            };
            updatedOrders = [...orders, newOrder];
        }

        const success = await window.api.saveOrders(updatedOrders);
        if (success) {
            setOrders(updatedOrders);
            setShowForm(false);
            setEditingId(null);
            setFormData({
                clientName: "",
                clientEmail: "",
                items: [],
                discountPercentage: 0,
                status: "draft",
                notes: "",
            });
            setCurrentItem({
                articleId: "",
                quantity: 1,
            });
            setMessage("Ordine salvato!");
            setTimeout(() => setMessage(""), 2000);
        }
    };

    const handleEdit = (order: Order) => {
        setEditingId(order.id);
        setFormData(order);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Eliminare questo ordine?")) {
            const updatedOrders = orders.filter((o) => o.id !== id);
            const success = await window.api.saveOrders(updatedOrders);
            if (success) {
                setOrders(updatedOrders);
                setMessage("Ordine eliminato!");
                setTimeout(() => setMessage(""), 2000);
            }
        }
    };

    const getArticleName = (articleId: string) => {
        return articles.find((a) => a.id === articleId)?.name || "-";
    };

    const getArticleCode = (articleId: string) => {
        return articles.find((a) => a.id === articleId)?.code || "-";
    };

    const ordersData = orders.map((order) => {
        const costs = calculateOrderCosts(order.items, order.discountPercentage);
        return { ...order, ...costs };
    });

    return (
        <div className="page">
            <div className="page-header">
                <h1>Ordini / Preventivi</h1>
                <button
                    className="btn-primary"
                    onClick={() => {
                        setShowForm(!showForm);
                        setEditingId(null);
                        setFormData({
                            clientName: "",
                            clientEmail: "",
                            items: [],
                            discountPercentage: 0,
                            status: "draft",
                            notes: "",
                        });
                        setCurrentItem({
                            articleId: "",
                            quantity: 1,
                        });
                    }}
                >
                    {showForm ? "Annulla" : "+ Nuovo Ordine"}
                </button>
            </div>

            {message && (
                <div className={`message ${message.includes("Errore") ? "error" : "success"}`}>
                    {message}
                </div>
            )}

            {showForm && (
                <form className="form" onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Nome Cliente *</label>
                            <input
                                type="text"
                                value={formData.clientName || ""}
                                onChange={(e) =>
                                    setFormData({ ...formData, clientName: e.target.value })
                                }
                                placeholder="Nome cliente"
                            />
                        </div>

                        <div className="form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                value={formData.clientEmail || ""}
                                onChange={(e) =>
                                    setFormData({ ...formData, clientEmail: e.target.value })
                                }
                                placeholder="email@example.com"
                            />
                        </div>
                    </div>

                    <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #ddd" }}>
                        <h3>Articoli</h3>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Articolo *</label>
                                <select
                                    value={currentItem.articleId || ""}
                                    onChange={(e) =>
                                        setCurrentItem({
                                            ...currentItem,
                                            articleId: e.target.value,
                                        })
                                    }
                                >
                                    <option value="">Seleziona articolo</option>
                                    {articles.map((a) => (
                                        <option key={a.id} value={a.id}>
                                            ({a.code}) {a.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Quantità *</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={currentItem.quantity || 1}
                                    onChange={(e) =>
                                        setCurrentItem({
                                            ...currentItem,
                                            quantity: parseInt(e.target.value),
                                        })
                                    }
                                />
                            </div>

                            <button
                                type="button"
                                className="btn-small"
                                onClick={addItem}
                                style={{ alignSelf: "flex-end" }}
                            >
                                Aggiungi Articolo
                            </button>
                        </div>

                        {(formData.items || []).length > 0 && (
                            <div style={{ marginTop: "15px" }}>
                                <h4>Articoli in Ordine:</h4>
                                <table style={{ width: "100%", fontSize: "0.9em" }}>
                                    <thead>
                                        <tr>
                                            <th>Articolo</th>
                                            <th>Qty</th>
                                            <th>Prezzo Unit.</th>
                                            <th>Totale</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(formData.items || []).map((item, idx) => (
                                            <tr key={idx}>
                                                <td>
                                                    {getArticleCode(item.articleId)} - {getArticleName(item.articleId)}
                                                </td>
                                                <td>{item.quantity}</td>
                                                <td>€{item.unitPrice.toFixed(2)}</td>
                                                <td>€{(item.unitPrice * item.quantity).toFixed(2)}</td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="btn-small btn-danger"
                                                        onClick={() => removeItem(idx)}
                                                    >
                                                        Rimuovi
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="form-row" style={{ marginTop: "20px" }}>
                        <div className="form-group">
                            <label>Sconto %</label>
                            <input
                                type="number"
                                value={formData.discountPercentage || 0}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        discountPercentage: parseFloat(e.target.value),
                                    })
                                }
                            />
                        </div>

                        <div className="form-group">
                            <label>Stato</label>
                            <select
                                value={formData.status || "draft"}
                                onChange={(e) =>
                                    setFormData({ ...formData, status: e.target.value as any })
                                }
                            >
                                <option value="draft">Bozza</option>
                                <option value="sent">Inviato</option>
                                <option value="accepted">Accettato</option>
                                <option value="rejected">Rifiutato</option>
                                <option value="completed">Completato</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group" style={{ marginTop: "15px" }}>
                        <label>Note</label>
                        <textarea
                            value={formData.notes || ""}
                            onChange={(e) =>
                                setFormData({ ...formData, notes: e.target.value })
                            }
                            placeholder="Note aggiuntive"
                            rows={3}
                        />
                    </div>

                    <button type="submit" className="btn-primary" style={{ marginTop: "20px" }}>
                        {editingId ? "Salva Modifiche" : "Crea Ordine"}
                    </button>
                </form>
            )}

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Cliente</th>
                            <th>Data</th>
                            <th>Articoli</th>
                            <th>Costo Materiale</th>
                            <th>Costo Lavoro</th>
                            <th>Totale</th>
                            <th>Stato</th>
                            <th>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ordersData.map((order) => (
                            <React.Fragment key={order.id}>
                                <tr>
                                    <td>{order.clientName}</td>
                                    <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                                    <td>{order.items.length}</td>
                                    <td>€{order.materialCost.toFixed(2)}</td>
                                    <td>€{order.laborCost.toFixed(2)}</td>
                                    <td style={{ fontWeight: "bold" }}>€{order.finalAmount.toFixed(2)}</td>
                                    <td>
                                        <span style={{
                                            padding: "4px 8px",
                                            borderRadius: "4px",
                                            fontSize: "0.85em",
                                            backgroundColor:
                                                order.status === "draft" ? "#ffeb3b" :
                                                order.status === "sent" ? "#2196f3" :
                                                order.status === "accepted" ? "#4caf50" :
                                                order.status === "completed" ? "#8bc34a" :
                                                "#f44336"
                                        }}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            className="btn-small"
                                            onClick={() =>
                                                setShowDetails(showDetails === order.id ? null : order.id)
                                            }
                                        >
                                            Dettagli
                                        </button>
                                        <button
                                            className="btn-small"
                                            onClick={() => handleEdit(order)}
                                        >
                                            Modifica
                                        </button>
                                        <button
                                            className="btn-small btn-danger"
                                            onClick={() => handleDelete(order.id)}
                                        >
                                            Elimina
                                        </button>
                                    </td>
                                </tr>
                                {showDetails === order.id && (
                                    <tr>
                                        <td colSpan={8} style={{ paddingLeft: "40px", backgroundColor: "#f5f5f5" }}>
                                            <div style={{ padding: "10px 0" }}>
                                                <p><strong>Email:</strong> {order.clientEmail || "N/A"}</p>
                                                <p><strong>Sconto:</strong> {order.discountPercentage}%</p>
                                                {order.notes && <p><strong>Note:</strong> {order.notes}</p>}
                                                <details open>
                                                    <summary style={{ cursor: "pointer", fontWeight: "bold" }}>Articoli Dettagliati</summary>
                                                    <table style={{ width: "100%", marginTop: "10px", fontSize: "0.9em" }}>
                                                        <thead>
                                                            <tr>
                                                                <th>Codice</th>
                                                                <th>Articolo</th>
                                                                <th>Qty</th>
                                                                <th>Prezzo Unit.</th>
                                                                <th>Totale</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {order.items.map((item, idx) => (
                                                                <tr key={idx}>
                                                                    <td>{getArticleCode(item.articleId)}</td>
                                                                    <td>{getArticleName(item.articleId)}</td>
                                                                    <td>{item.quantity}</td>
                                                                    <td>€{item.unitPrice.toFixed(2)}</td>
                                                                    <td>€{(item.unitPrice * item.quantity).toFixed(2)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </details>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

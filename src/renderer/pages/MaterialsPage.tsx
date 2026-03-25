import React, { useState, useEffect } from "react";
import "../styles/Page.css";

interface Material {
    id: string;
    name: string;
    costPerGramm: number;
    sellingPricePerGramm: number;
    currentStockGramms: number;
    unit: "grammi" | "pezzi";
    lastUpdated: string;
}

export const MaterialsPage: React.FC = () => {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Material>>({
        name: "",
        costPerGramm: 0,
        sellingPricePerGramm: 0,
        currentStockGramms: 0,
        unit: "grammi",
    });
    const [message, setMessage] = useState("");

    useEffect(() => {
        loadMaterials();
    }, []);

    const loadMaterials = async () => {
        try {
            const data = await window.api.getMaterials();
            setMaterials(data);
        } catch (error) {
            setMessage("Errore nel caricamento dei materiali");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.costPerGramm) {
            setMessage("Completa tutti i campi richiesti");
            return;
        }

        let updatedMaterials: Material[];

        if (editingId) {
            updatedMaterials = materials.map((m) =>
                m.id === editingId
                    ? {
                          ...m,
                          ...(formData as any),
                          lastUpdated: new Date().toISOString(),
                      }
                    : m
            );
        } else {
            const newMaterial: Material = {
                id: Date.now().toString(),
                ...(formData as any),
                lastUpdated: new Date().toISOString(),
            };
            updatedMaterials = [...materials, newMaterial];
        }

        const success = await window.api.saveMaterials(updatedMaterials);
        if (success) {
            setMaterials(updatedMaterials);
            setShowForm(false);
            setEditingId(null);
            setFormData({
                name: "",
                costPerGramm: 0,
                sellingPricePerGramm: 0,
                currentStockGramms: 0,
                unit: "grammi",
            });
            setMessage("Materiale salvato!");
            setTimeout(() => setMessage(""), 2000);
        }
    };

    const handleEdit = (material: Material) => {
        setEditingId(material.id);
        setFormData(material);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Eliminare questo materiale?")) {
            const updatedMaterials = materials.filter((m) => m.id !== id);
            const success = await window.api.saveMaterials(updatedMaterials);
            if (success) {
                setMaterials(updatedMaterials);
                setMessage("Materiale eliminato!");
                setTimeout(() => setMessage(""), 2000);
            }
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <h1>Magazzino Materia Prima</h1>
                <button
                    className="btn-primary"
                    onClick={() => {
                        setShowForm(!showForm);
                        setEditingId(null);
                        setFormData({
                            name: "",
                            costPerGramm: 0,
                            sellingPricePerGramm: 0,
                            currentStockGramms: 0,
                            unit: "grammi",
                        });
                    }}
                >
                    {showForm ? "Annulla" : "+ Nuovo Materiale"}
                </button>
            </div>

            {message && (
                <div className={`message ${message.includes("Errore") ? "error" : "success"}`}>
                    {message}
                </div>
            )}

            {showForm && (
                <form className="form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Nome Materiale *</label>
                        <input
                            type="text"
                            value={formData.name || ""}
                            onChange={(e) =>
                                setFormData({ ...formData, name: e.target.value })
                            }
                            placeholder="Es: Lana, Ovatta, Fettuccia..."
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Costo per Grammo (€) *</label>
                            <input
                                type="number"
                                step="0.001"
                                value={formData.costPerGramm || 0}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        costPerGramm: parseFloat(e.target.value),
                                    })
                                }
                            />
                        </div>

                        <div className="form-group">
                            <label>Prezzo Vendita per Grammo (€)</label>
                            <input
                                type="number"
                                step="0.001"
                                value={formData.sellingPricePerGramm || 0}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        sellingPricePerGramm: parseFloat(e.target.value),
                                    })
                                }
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Stock Iniziale (grammi)</label>
                            <input
                                type="number"
                                value={formData.currentStockGramms || 0}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        currentStockGramms: parseFloat(e.target.value),
                                    })
                                }
                            />
                        </div>

                        <div className="form-group">
                            <label>Unità di Misura</label>
                            <select
                                value={formData.unit || "grammi"}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        unit: e.target.value as "grammi" | "pezzi",
                                    })
                                }
                            >
                                <option value="grammi">Grammi</option>
                                <option value="pezzi">Pezzi</option>
                            </select>
                        </div>
                    </div>

                    <button type="submit" className="btn-primary">
                        {editingId ? "Salva Modifiche" : "Aggiungi Materiale"}
                    </button>
                </form>
            )}

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Nome</th>
                            <th>Costo €/g</th>
                            <th>Prezzo Vendita €/g</th>
                            <th>Stock Attuale</th>
                            <th>Unità</th>
                            <th>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {materials.map((material) => (
                            <tr key={material.id}>
                                <td>{material.name}</td>
                                <td>{material.costPerGramm.toFixed(3)}</td>
                                <td>{material.sellingPricePerGramm.toFixed(3)}</td>
                                <td>{material.currentStockGramms.toFixed(0)}</td>
                                <td>{material.unit}</td>
                                <td>
                                    <button
                                        className="btn-small"
                                        onClick={() => handleEdit(material)}
                                    >
                                        Modifica
                                    </button>
                                    <button
                                        className="btn-small btn-danger"
                                        onClick={() => handleDelete(material.id)}
                                    >
                                        Elimina
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

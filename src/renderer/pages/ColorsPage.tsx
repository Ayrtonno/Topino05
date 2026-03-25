import React, { useState, useEffect } from "react";
import "../styles/Page.css";

interface Color {
    id: string;
    materialId: string;
    colorName: string;
    colorCode?: string;
    stockInGramms: number;
    lastUpdated: string;
}

interface Material {
    id: string;
    name: string;
}

export const ColorsPage: React.FC = () => {
    const [colors, setColors] = useState<Color[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Color>>({
        materialId: "",
        colorName: "",
        colorCode: "",
        stockInGramms: 0,
    });
    const [message, setMessage] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const colorsData = await window.api.getColors();
            const materialsData = await window.api.getMaterials();
            setColors(colorsData);
            setMaterials(materialsData);
        } catch (error) {
            setMessage("Errore nel caricamento dei dati");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.materialId || !formData.colorName || !formData.stockInGramms) {
            setMessage("Completa tutti i campi richiesti");
            return;
        }

        let updatedColors: Color[];

        if (editingId) {
            updatedColors = colors.map((c) =>
                c.id === editingId
                    ? {
                          ...c,
                          ...(formData as any),
                          lastUpdated: new Date().toISOString(),
                      }
                    : c
            );
        } else {
            const newColor: Color = {
                id: Date.now().toString(),
                ...(formData as any),
                lastUpdated: new Date().toISOString(),
            };
            updatedColors = [...colors, newColor];
        }

        const success = await window.api.saveColors(updatedColors);
        if (success) {
            setColors(updatedColors);
            setShowForm(false);
            setEditingId(null);
            setFormData({
                materialId: "",
                colorName: "",
                colorCode: "",
                stockInGramms: 0,
            });
            setMessage("Colore salvato!");
            setTimeout(() => setMessage(""), 2000);
        }
    };

    const handleEdit = (color: Color) => {
        setEditingId(color.id);
        setFormData(color);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Eliminare questo colore?")) {
            const updatedColors = colors.filter((c) => c.id !== id);
            const success = await window.api.saveColors(updatedColors);
            if (success) {
                setColors(updatedColors);
                setMessage("Colore eliminato!");
                setTimeout(() => setMessage(""), 2000);
            }
        }
    };

    const getMaterialName = (materialId: string) => {
        return materials.find((m) => m.id === materialId)?.name || "-";
    };

    return (
        <div className="page">
            <div className="page-header">
                <h1>Giacenza Colori</h1>
                <button
                    className="btn-primary"
                    onClick={() => {
                        setShowForm(!showForm);
                        setEditingId(null);
                        setFormData({
                            materialId: "",
                            colorName: "",
                            colorCode: "",
                            stockInGramms: 0,
                        });
                    }}
                >
                    {showForm ? "Annulla" : "+ Nuovo Colore"}
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
                        <label>Materiale *</label>
                        <select
                            value={formData.materialId || ""}
                            onChange={(e) =>
                                setFormData({ ...formData, materialId: e.target.value })
                            }
                        >
                            <option value="">Seleziona un materiale</option>
                            {materials.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Nome Colore *</label>
                            <input
                                type="text"
                                value={formData.colorName || ""}
                                onChange={(e) =>
                                    setFormData({ ...formData, colorName: e.target.value })
                                }
                                placeholder="Es: Rosso, Blu, Verde..."
                            />
                        </div>

                        <div className="form-group">
                            <label>Codice Colore</label>
                            <input
                                type="text"
                                value={formData.colorCode || ""}
                                onChange={(e) =>
                                    setFormData({ ...formData, colorCode: e.target.value })
                                }
                                placeholder="Es: #FF0000"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Stock in Grammi *</label>
                        <input
                            type="number"
                            value={formData.stockInGramms || 0}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    stockInGramms: parseFloat(e.target.value),
                                })
                            }
                        />
                    </div>

                    <button type="submit" className="btn-primary">
                        {editingId ? "Salva Modifiche" : "Aggiungi Colore"}
                    </button>
                </form>
            )}

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Materiale</th>
                            <th>Colore</th>
                            <th>Codice</th>
                            <th>Stock (g)</th>
                            <th>Ultimo Aggiornamento</th>
                            <th>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {colors.map((color) => (
                            <tr key={color.id}>
                                <td>{getMaterialName(color.materialId)}</td>
                                <td>{color.colorName}</td>
                                <td>{color.colorCode || "-"}</td>
                                <td>{color.stockInGramms.toFixed(0)}</td>
                                <td>{new Date(color.lastUpdated).toLocaleDateString()}</td>
                                <td>
                                    <button
                                        className="btn-small"
                                        onClick={() => handleEdit(color)}
                                    >
                                        Modifica
                                    </button>
                                    <button
                                        className="btn-small btn-danger"
                                        onClick={() => handleDelete(color.id)}
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

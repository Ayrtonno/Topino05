import React, { useState, useEffect } from "react";
import "../styles/Page.css";

interface ArticleComposition {
    materialId: string;
    colorId: string;
    quantityGramms: number;
}

interface Article {
    id: string;
    code: string;
    name: string;
    composition: ArticleComposition[];
    laborHoursRequired: number;
    marginPercentage: number | 0;
    createdAt: string;
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
}

export const ArticlesPage: React.FC = () => {
    const [articles, setArticles] = useState<Article[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [colors, setColors] = useState<Color[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Article>>({
        code: "",
        name: "",
        composition: [],
        laborHoursRequired: 0,
        marginPercentage: 0,
    });
    const [currentComposition, setCurrentComposition] = useState<ArticleComposition>({
        materialId: "",
        colorId: "",
        quantityGramms: 0,
    });
    const [message, setMessage] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const articlesData = await window.api.getArticles();
            const materialsData = await window.api.getMaterials();
            const colorsData = await window.api.getColors();
            setArticles(articlesData);
            setMaterials(materialsData);
            setColors(colorsData);
        } catch (error) {
            setMessage("Errore nel caricamento dei dati");
        }
    };

    const getAvailableColors = () => {
        if (!currentComposition.materialId) return [];
        return colors.filter((c) => c.materialId === currentComposition.materialId);
    };

    const addComposition = () => {
        if (!currentComposition.materialId || !currentComposition.colorId || !currentComposition.quantityGramms) {
            setMessage("Completa tutti i campi della composizione");
            return;
        }

        const newComposition: ArticleComposition[] = [
            ...(formData.composition || []),
            currentComposition,
        ];

        setFormData({
            ...formData,
            composition: newComposition,
        });

        setCurrentComposition({
            materialId: "",
            colorId: "",
            quantityGramms: 0,
        });

        setMessage("Componente aggiunto!");
        setTimeout(() => setMessage(""), 2000);
    };

    const removeComposition = (index: number) => {
        const newComposition = (formData.composition || []).filter((_, i) => i !== index);
        setFormData({
            ...formData,
            composition: newComposition,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.code || !formData.name || !formData.composition || formData.composition.length === 0) {
            setMessage("Completa tutti i campi obbligatori");
            return;
        }

        let updatedArticles: Article[];

        if (editingId) {
            updatedArticles = articles.map((a) =>
                a.id === editingId
                    ? {
                          ...a,
                          ...(formData as any),
                          createdAt: a.createdAt,
                      }
                    : a
            );
        } else {
            const newArticle: Article = {
                id: Date.now().toString(),
                ...(formData as any),
                createdAt: new Date().toISOString(),
            };
            updatedArticles = [...articles, newArticle];
        }

        const success = await window.api.saveArticles(updatedArticles);
        if (success) {
            setArticles(updatedArticles);
            setShowForm(false);
            setEditingId(null);
            setFormData({
                code: "",
                name: "",
                composition: [],
                laborHoursRequired: 0,
                marginPercentage: 0,
            });
            setCurrentComposition({
                materialId: "",
                colorId: "",
                quantityGramms: 0,
            });
            setMessage("Articolo salvato!");
            setTimeout(() => setMessage(""), 2000);
        }
    };

    const handleEdit = (article: Article) => {
        setEditingId(article.id);
        setFormData(article);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Eliminare questo articolo?")) {
            const updatedArticles = articles.filter((a) => a.id !== id);
            const success = await window.api.saveArticles(updatedArticles);
            if (success) {
                setArticles(updatedArticles);
                setMessage("Articolo eliminato!");
                setTimeout(() => setMessage(""), 2000);
            }
        }
    };

    const getMaterialName = (materialId: string) => {
        return materials.find((m) => m.id === materialId)?.name || "-";
    };

    const getColorName = (colorId: string) => {
        return colors.find((c) => c.id === colorId)?.colorName || "-";
    };

    const calculateCompositionCost = (composition: ArticleComposition[]) => {
        return composition.reduce((total, comp) => {
            const material = materials.find((m) => m.id === comp.materialId);
            return total + (material?.costPerGramm || 0) * comp.quantityGramms;
        }, 0);
    };

    return (
        <div className="page">
            <div className="page-header">
                <h1>Articoli</h1>
                <button
                    className="btn-primary"
                    onClick={() => {
                        setShowForm(!showForm);
                        setEditingId(null);
                        setFormData({
                            code: "",
                            name: "",
                            composition: [],
                            laborHoursRequired: 0,
                            marginPercentage: 0,
                        });
                        setCurrentComposition({
                            materialId: "",
                            colorId: "",
                            quantityGramms: 0,
                        });
                    }}
                >
                    {showForm ? "Annulla" : "+ Nuovo Articolo"}
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
                            <label>Codice Articolo *</label>
                            <input
                                type="text"
                                value={formData.code || ""}
                                onChange={(e) =>
                                    setFormData({ ...formData, code: e.target.value })
                                }
                                placeholder="Es: GU001A, PL001A..."
                            />
                        </div>

                        <div className="form-group">
                            <label>Nome Articolo *</label>
                            <input
                                type="text"
                                value={formData.name || ""}
                                onChange={(e) =>
                                    setFormData({ ...formData, name: e.target.value })
                                }
                                placeholder="Nome descrittivo"
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Ore Lavoro</label>
                            <input
                                type="number"
                                step="0.5"
                                value={formData.laborHoursRequired || 0}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        laborHoursRequired: parseFloat(e.target.value),
                                    })
                                }
                            />
                        </div>

                        <div className="form-group">
                            <label>Margine %</label>
                            <input
                                type="number"
                                value={formData.marginPercentage ?? 0}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        marginPercentage: parseFloat(e.target.value),
                                    })
                                }
                            />
                        </div>
                    </div>

                    <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #ddd" }}>
                        <h3>Composizione</h3>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Materiale *</label>
                                <select
                                    value={currentComposition.materialId}
                                    onChange={(e) =>
                                        setCurrentComposition({
                                            ...currentComposition,
                                            materialId: e.target.value,
                                            colorId: "",
                                        })
                                    }
                                >
                                    <option value="">Seleziona materiale</option>
                                    {materials.map((m) => (
                                        <option key={m.id} value={m.id}>
                                            {m.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Colore *</label>
                                <select
                                    value={currentComposition.colorId}
                                    onChange={(e) =>
                                        setCurrentComposition({
                                            ...currentComposition,
                                            colorId: e.target.value,
                                        })
                                    }
                                    disabled={!currentComposition.materialId}
                                >
                                    <option value="">Seleziona colore</option>
                                    {getAvailableColors().map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.colorName}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Quantità (g) *</label>
                                <input
                                    type="number"
                                    value={currentComposition.quantityGramms}
                                    onChange={(e) =>
                                        setCurrentComposition({
                                            ...currentComposition,
                                            quantityGramms: parseFloat(e.target.value),
                                        })
                                    }
                                />
                            </div>

                            <button
                                type="button"
                                className="btn-small"
                                onClick={addComposition}
                                style={{ alignSelf: "flex-end" }}
                            >
                                Aggiungi
                            </button>
                        </div>

                        {(formData.composition || []).length > 0 && (
                            <div style={{ marginTop: "15px" }}>
                                <h4>Componenti Aggiunti:</h4>
                                <table style={{ width: "100%", fontSize: "0.9em" }}>
                                    <thead>
                                        <tr>
                                            <th>Materiale</th>
                                            <th>Colore</th>
                                            <th>Quantità (g)</th>
                                            <th>Costo</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(formData.composition || []).map((comp, idx) => (
                                            <tr key={idx}>
                                                <td>{getMaterialName(comp.materialId)}</td>
                                                <td>{getColorName(comp.colorId)}</td>
                                                <td>{comp.quantityGramms}</td>
                                                <td>
                                                    €{((materials.find((m) => m.id === comp.materialId)?.costPerGramm || 0) * comp.quantityGramms).toFixed(3)}
                                                </td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="btn-small btn-danger"
                                                        onClick={() => removeComposition(idx)}
                                                    >
                                                        Rimuovi
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div style={{ marginTop: "10px", fontWeight: "bold" }}>
                                    Costo Materiale: €{calculateCompositionCost(formData.composition || []).toFixed(2)}
                                </div>
                            </div>
                        )}
                    </div>

                    <button type="submit" className="btn-primary" style={{ marginTop: "20px" }}>
                        {editingId ? "Salva Modifiche" : "Aggiungi Articolo"}
                    </button>
                </form>
            )}

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Codice</th>
                            <th>Nome</th>
                            <th>Componenti</th>
                            <th>Ore Lavoro</th>
                            <th>Margine</th>
                            <th>Costo Material</th>
                            <th>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {articles.map((article) => (
                            <tr key={article.id}>
                                <td>{article.code}</td>
                                <td>{article.name}</td>
                                <td>{article.composition.length}</td>
                                <td>{article.laborHoursRequired}h</td>
                                <td>{article.marginPercentage}%</td>
                                <td>€{calculateCompositionCost(article.composition).toFixed(2)}</td>
                                <td>
                                    <button
                                        className="btn-small"
                                        onClick={() => handleEdit(article)}
                                    >
                                        Modifica
                                    </button>
                                    <button
                                        className="btn-small btn-danger"
                                        onClick={() => handleDelete(article.id)}
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

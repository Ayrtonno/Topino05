import React, { useState, useEffect } from "react";
import "../styles/Page.css";

interface Order {
    id: string;
    finalAmount: number;
    materialCost: number;
    laborCost: number;
    status: string;
    createdAt: string;
}

interface LaborConfig {
    hourlyRate: number;
}

interface Dashboard {
    salesTarget: number;
    currentMonth: number;
}

export const DashboardPage: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [laborConfig, setLaborConfig] = useState<LaborConfig>({ hourlyRate: 25 });
    const [dashboard, setDashboard] = useState<Dashboard>({
        salesTarget: 10000,
        currentMonth: new Date().getMonth(),
    });
    const [editingTarget, setEditingTarget] = useState(false);
    const [targetInput, setTargetInput] = useState("10000");
    const [message, setMessage] = useState("");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const ordersData = await window.api.getOrders();
            const configData = await window.api.getLaborConfig();
            const dashboardConfigData = await window.api.getDashboardConfig();
            setOrders(ordersData);
            setLaborConfig(configData);
            setDashboard({
                ...dashboard,
                salesTarget: dashboardConfigData.salesTarget || 10000,
            });
            setTargetInput((dashboardConfigData.salesTarget || 10000).toString());
        } catch (error) {
            setMessage("Errore nel caricamento dei dati");
        }
    };

    const calculateKPI = () => {
        const completedOrders = orders.filter((o) => o.status === "completed");
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();

        const thisMonthOrders = completedOrders.filter((o) => {
            const orderDate = new Date(o.createdAt);
            return (
                orderDate.getFullYear() === currentYear &&
                orderDate.getMonth() === currentMonth
            );
        });

        const totalRevenue = thisMonthOrders.reduce((sum, o) => sum + o.finalAmount, 0);
        const totalCost = thisMonthOrders.reduce(
            (sum, o) => sum + (o.materialCost + o.laborCost),
            0
        );
        const totalProfit = totalRevenue - totalCost;

        const percentageReached = (totalRevenue / dashboard.salesTarget) * 100;

        return {
            totalOrders: thisMonthOrders.length,
            totalRevenue: parseFloat(totalRevenue.toFixed(2)),
            totalProfit: parseFloat(totalProfit.toFixed(2)),
            totalCost: parseFloat(totalCost.toFixed(2)),
            percentageReached: parseFloat(percentageReached.toFixed(1)),
        };
    };

    const kpi = calculateKPI();

    const handleSaveTarget = async () => {
        const newTarget = parseFloat(targetInput);
        if (isNaN(newTarget) || newTarget <= 0) {
            setMessage("Inserisci un valore valido");
            return;
        }
        const newDashboard = { ...dashboard, salesTarget: newTarget };
        setDashboard(newDashboard);
        
        // Salva su file
        const success = await window.api.saveDashboardConfig({
            salesTarget: newTarget,
            lastUpdated: new Date().toISOString(),
        });
        
        if (success) {
            setEditingTarget(false);
            setMessage("Target salvato!");
            setTimeout(() => setMessage(""), 2000);
        } else {
            setMessage("Errore nel salvataggio!");
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <h1>📊 Dashboard KPI</h1>
            </div>

            {message && (
                <div className={`message ${message.includes("Errore") ? "error" : "success"}`}>
                    {message}
                </div>
            )}

            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "20px",
                marginBottom: "30px"
            }}>
                {/* KPI Card: Numero Ordini */}
                <div style={{
                    backgroundColor: "#e3f2fd",
                    padding: "20px",
                    borderRadius: "8px",
                    border: "2px solid #2196f3",
                    textAlign: "center"
                }}>
                    <div style={{ fontSize: "0.9em", color: "#666" }}>Numero Ordini (Mese)</div>
                    <div style={{
                        fontSize: "2.5em",
                        fontWeight: "bold",
                        color: "#2196f3",
                        marginTop: "10px"
                    }}>
                        {kpi.totalOrders}
                    </div>
                </div>

                {/* KPI Card: Guadagno */}
                <div style={{
                    backgroundColor: "#e8f5e9",
                    padding: "20px",
                    borderRadius: "8px",
                    border: "2px solid #4caf50",
                    textAlign: "center"
                }}>
                    <div style={{ fontSize: "0.9em", color: "#666" }}>Guadagno (Mese)</div>
                    <div style={{
                        fontSize: "2.5em",
                        fontWeight: "bold",
                        color: "#4caf50",
                        marginTop: "10px"
                    }}>
                        €{kpi.totalProfit.toFixed(2)}
                    </div>
                </div>

                {/* KPI Card: Fatturato */}
                <div style={{
                    backgroundColor: "#f3e5f5",
                    padding: "20px",
                    borderRadius: "8px",
                    border: "2px solid #9c27b0",
                    textAlign: "center"
                }}>
                    <div style={{ fontSize: "0.9em", color: "#666" }}>Fatturato (Mese)</div>
                    <div style={{
                        fontSize: "2.5em",
                        fontWeight: "bold",
                        color: "#9c27b0",
                        marginTop: "10px"
                    }}>
                        €{kpi.totalRevenue.toFixed(2)}
                    </div>
                </div>

                {/* KPI Card: Costi */}
                <div style={{
                    backgroundColor: "#ffe0b2",
                    padding: "20px",
                    borderRadius: "8px",
                    border: "2px solid #ff9800",
                    textAlign: "center"
                }}>
                    <div style={{ fontSize: "0.9em", color: "#666" }}>Costi Totali (Mese)</div>
                    <div style={{
                        fontSize: "2.5em",
                        fontWeight: "bold",
                        color: "#ff9800",
                        marginTop: "10px"
                    }}>
                        €{kpi.totalCost.toFixed(2)}
                    </div>
                </div>
            </div>

            {/* Target Section */}
            <div style={{
                backgroundColor: "#fff3e0",
                padding: "20px",
                borderRadius: "8px",
                border: "2px solid #ff9800",
                marginBottom: "30px"
            }}>
                <h2 style={{ marginTop: 0 }}>🎯 Target Mensile</h2>

                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "15px",
                    gap: "15px",
                    flexWrap: "wrap"
                }}>
                    <div>
                        {editingTarget ? (
                            <div style={{ display: "flex", gap: "10px" }}>
                                <input
                                    type="number"
                                    value={targetInput}
                                    onChange={(e) => setTargetInput(e.target.value)}
                                    style={{
                                        padding: "8px",
                                        borderRadius: "4px",
                                        border: "1px solid #ddd",
                                        width: "150px"
                                    }}
                                />
                                <button
                                    className="btn-small"
                                    onClick={handleSaveTarget}
                                >
                                    Salva
                                </button>
                                <button
                                    className="btn-small"
                                    onClick={() => {
                                        setEditingTarget(false);
                                        setTargetInput(dashboard.salesTarget.toString());
                                    }}
                                >
                                    Annulla
                                </button>
                            </div>
                        ) : (
                            <div>
                                <span style={{ fontSize: "1.5em", fontWeight: "bold", color: "#ff9800" }}>
                                    €{dashboard.salesTarget.toFixed(2)}
                                </span>
                                <button
                                    className="btn-small"
                                    onClick={() => {
                                        setEditingTarget(true);
                                        setTargetInput(dashboard.salesTarget.toString());
                                    }}
                                    style={{ marginLeft: "10px" }}
                                >
                                    Modifica
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress Bar */}
                <div style={{
                    backgroundColor: "#e0e0e0",
                    borderRadius: "8px",
                    height: "30px",
                    overflow: "hidden",
                    marginBottom: "10px"
                }}>
                    <div style={{
                        backgroundColor: kpi.percentageReached >= 100 ? "#4caf50" : "#2196f3",
                        height: "100%",
                        width: `${Math.min(kpi.percentageReached, 100)}%`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontWeight: "bold",
                        transition: "width 0.3s ease"
                    }}>
                        {kpi.percentageReached.toFixed(1)}%
                    </div>
                </div>

                {kpi.percentageReached >= 100 ? (
                    <div style={{
                        color: "#4caf50",
                        fontSize: "1.1em",
                        fontWeight: "bold"
                    }}>
                        ✓ Target raggiunto!
                    </div>
                ) : (
                    <div style={{ color: "#ff9800" }}>
                        Mancano: €{(dashboard.salesTarget - kpi.totalRevenue).toFixed(2)}
                    </div>
                )}
            </div>

            {/* Stats Table */}
            <div style={{
                backgroundColor: "#f5f5f5",
                padding: "20px",
                borderRadius: "8px"
            }}>
                <h2 style={{ marginTop: 0 }}>Statistiche Dettagliate</h2>

                <table style={{ width: "100%" }}>
                    <thead>
                        <tr style={{ borderBottom: "2px solid #ddd" }}>
                            <th style={{ textAlign: "left", padding: "10px" }}>Metrica</th>
                            <th style={{ textAlign: "right", padding: "10px" }}>Valore</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style={{ borderBottom: "1px solid #e0e0e0" }}>
                            <td style={{ padding: "10px" }}>Numero Ordini (Mese)</td>
                            <td style={{ textAlign: "right", padding: "10px", fontWeight: "bold" }}>{kpi.totalOrders}</td>
                        </tr>
                        <tr style={{ borderBottom: "1px solid #e0e0e0" }}>
                            <td style={{ padding: "10px" }}>Fatturato Totale</td>
                            <td style={{ textAlign: "right", padding: "10px", fontWeight: "bold" }}>€{kpi.totalRevenue.toFixed(2)}</td>
                        </tr>
                        <tr style={{ borderBottom: "1px solid #e0e0e0" }}>
                            <td style={{ padding: "10px" }}>Costi Totali (Materiali + Lavoro)</td>
                            <td style={{ textAlign: "right", padding: "10px", fontWeight: "bold" }}>€{kpi.totalCost.toFixed(2)}</td>
                        </tr>
                        <tr style={{ borderBottom: "1px solid #e0e0e0" }}>
                            <td style={{ padding: "10px" }}>Guadagno Netto</td>
                            <td style={{ textAlign: "right", padding: "10px", fontWeight: "bold", color: kpi.totalProfit > 0 ? "#4caf50" : "#f44336" }}>
                                €{kpi.totalProfit.toFixed(2)}
                            </td>
                        </tr>
                        <tr style={{ borderBottom: "1px solid #e0e0e0" }}>
                            <td style={{ padding: "10px" }}>Margine Medio %</td>
                            <td style={{ textAlign: "right", padding: "10px", fontWeight: "bold" }}>
                                {kpi.totalRevenue > 0 ? (((kpi.totalProfit / kpi.totalRevenue) * 100).toFixed(1)) : "0"}%
                            </td>
                        </tr>
                        <tr style={{ backgroundColor: "#fff9c4" }}>
                            <td style={{ padding: "10px" }}>Raggiungimento Target</td>
                            <td style={{ textAlign: "right", padding: "10px", fontWeight: "bold", color: "#ff9800" }}>
                                {kpi.percentageReached.toFixed(1)}% / 100%
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Info Box */}
            <div style={{
                backgroundColor: "#e3f2fd",
                padding: "15px",
                borderRadius: "8px",
                marginTop: "20px",
                color: "#1565c0"
            }}>
                <p style={{ margin: "0" }}>
                    <strong>ℹ️ Nota:</strong> I dati mostrati si riferiscono al mese corrente (dicembre). Vengono conteggiate solo gli ordini con stato "Completato".
                </p>
            </div>
        </div>
    );
};

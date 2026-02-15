'use client';

import { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, CreditCard } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';

export default function FinancePage() {
    const [stats, setStats] = useState({ income: 0, expenses: 0, net: 0 });

    useEffect(() => {
        fetch('http://localhost:3001/dashboard/finance')
            .then(res => res.json())
            .then(data => setStats(data))
            .catch(err => console.error('Error fetching finance:', err));
    }, []);

    return (
        <PageContainer>
            <h1 className="text-3xl font-serif font-bold mb-6">Finanzas</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-card p-6 rounded-lg border shadow-sm">
                    <h3 className="uppercase text-sm font-bold text-muted-foreground">Ingresos (Mes)</h3>
                    <p className="text-3xl font-bold mt-2">${stats.income.toFixed(2)}</p>
                </div>
                <div className="bg-card p-6 rounded-lg border shadow-sm">
                    <h3 className="uppercase text-sm font-bold text-muted-foreground">Egresos (Mes)</h3>
                    <p className="text-3xl font-bold mt-2 text-red-500">${stats.expenses.toFixed(2)}</p>
                </div>
                <div className="bg-card p-6 rounded-lg border shadow-sm">
                    <h3 className="uppercase text-sm font-bold text-muted-foreground">Utilidad Neta</h3>
                    <p className={`text-3xl font-bold mt-2 ${stats.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${stats.net.toFixed(2)}
                    </p>
                </div>
            </div>
        </PageContainer>
    );
}

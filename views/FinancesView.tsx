import React from 'react';
import type { ExpenseCategory, FinanceSummaryDTO, RevenueCategory } from '@/src/game/api';

interface FinancesViewProps {
  summary: FinanceSummaryDTO | null;
}

const categoryNames: Record<ExpenseCategory, string> = {
  rent: 'Rent',
  maintenance: 'Maintenance',
  power: 'Power',
  structures: 'Structure Fees',
  devices: 'Devices',
  supplies: 'Supplies',
  seeds: 'Seeds',
  salaries: 'Salaries',
};

const revenueCategoryNames: Record<RevenueCategory, string> = {
  harvests: 'Harvests',
  other: 'Other',
};

const formatCurrency = (value: number) => {
    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const FinancesView: React.FC<FinancesViewProps> = ({ summary }) => {
  if (!summary) {
    return (
      <div className="finances-view">
        <div className="content-panel">
          <div className="content-panel__header">
            <h2>Financial Summary</h2>
          </div>
          <p className="placeholder-text">Financial data is not available yet.</p>
        </div>
      </div>
    );
  }

  const {
    netProfit,
    totalRevenue,
    totalExpenses,
    cumulativeYield_g,
    revenue,
    operatingExpenses,
    capitalExpenses,
    operatingTotal,
    capitalTotal,
  } = summary;

  return (
    <div className="finances-view">
      <div className="content-panel">
        <div className="content-panel__header">
          <h2>Financial Summary</h2>
        </div>
        <div className="summary-cards">
          <div className="summary-card">
            <h4>Net Profit/Loss</h4>
            <p className={netProfit >= 0 ? 'positive' : 'negative'}>{formatCurrency(netProfit)}</p>
          </div>
          <div className="summary-card">
            <h4>Total Revenue</h4>
            <p className="positive">{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="summary-card">
            <h4>Harvest Revenue</h4>
            <p className="positive">{formatCurrency(revenue.find(entry => entry.category === 'harvests')?.total ?? 0)}</p>
          </div>
           <div className="summary-card">
            <h4>Cumulative Yield</h4>
            <p className="positive">{(cumulativeYield_g || 0).toFixed(2)} g</p>
          </div>
          <div className="summary-card">
            <h4>Total Expenses</h4>
            <p className="negative">{formatCurrency(totalExpenses)}</p>
          </div>
        </div>
      </div>
      
      <div className="content-panel">
        <div className="content-panel__header">
          <h2>Revenue Breakdown</h2>
        </div>
        <table className="breakdown-table">
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Total</th>
                    <th>Avg. per Day</th>
                </tr>
            </thead>
            <tbody>
              {revenue.map(entry => (
                <tr key={entry.category}>
                  <td>{revenueCategoryNames[entry.category]}</td>
                  <td>{formatCurrency(entry.total)}</td>
                  <td>{formatCurrency(entry.averagePerDay)}</td>
                </tr>
              ))}
              <tr style={{fontWeight: 'bold', borderTop: '2px solid var(--border-color)'}}>
                <td>Total Revenue</td>
                <td>{formatCurrency(totalRevenue)}</td>
                <td>{formatCurrency(revenue.reduce((sum, entry) => sum + entry.averagePerDay, 0))}</td>
              </tr>
            </tbody>
        </table>
      </div>


      <div className="content-panel">
        <div className="content-panel__header">
          <h2>Expense Breakdown</h2>
        </div>
        <table className="breakdown-table">
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Total</th>
                    <th>Avg. per Day</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td colSpan={3}><strong>Operating Expenses</strong></td>
                </tr>
                {operatingExpenses.map(entry => (
                    <tr key={entry.category}>
                        <td>&nbsp;&nbsp;&nbsp;{categoryNames[entry.category]}</td>
                        <td>{formatCurrency(entry.total)}</td>
                        <td>{formatCurrency(entry.averagePerDay)}</td>
                    </tr>
                ))}
                 <tr style={{fontWeight: 'bold'}}>
                    <td>&nbsp;&nbsp;&nbsp;Total Operating</td>
                    <td>{formatCurrency(operatingTotal.total)}</td>
                    <td>{formatCurrency(operatingTotal.averagePerDay)}</td>
                </tr>


                <tr>
                    <td colSpan={3} style={{paddingTop: '2rem'}}><strong>Capital Expenditures</strong></td>
                </tr>
                 {capitalExpenses.map(entry => (
                    <tr key={entry.category}>
                        <td>&nbsp;&nbsp;&nbsp;{categoryNames[entry.category]}</td>
                        <td>{formatCurrency(entry.total)}</td>
                        <td>{formatCurrency(entry.averagePerDay)}</td>
                    </tr>
                ))}
                 <tr style={{fontWeight: 'bold'}}>
                    <td>&nbsp;&nbsp;&nbsp;Total Capital</td>
                    <td>{formatCurrency(capitalTotal.total)}</td>
                    <td>{formatCurrency(capitalTotal.averagePerDay)}</td>
                </tr>
                 <tr style={{fontWeight: 'bold', borderTop: '2px solid var(--border-color)'}}>
                    <td>Total Expenses</td>
                    <td>{formatCurrency(totalExpenses)}</td>
                    <td>{formatCurrency(operatingTotal.averagePerDay + capitalTotal.averagePerDay)}</td>
                </tr>
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default FinancesView;
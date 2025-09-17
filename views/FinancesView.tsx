import React from 'react';
import { Company, ExpenseCategory } from '../game/types';

interface FinancesViewProps {
  company: Company;
  ticks: number;
}

const categoryNames: Record<ExpenseCategory, string> = {
  rent: 'Rent',
  maintenance: 'Maintenance',
  power: 'Power',
  structures: 'Structure Fees',
  devices: 'Devices',
  supplies: 'Supplies',
  seeds: 'Seeds',
};

const formatCurrency = (value: number) => {
    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const FinancesView: React.FC<FinancesViewProps> = ({ company, ticks }) => {
  // FIX: Destructure only 'ledger' from company; 'ticks' is now a separate prop.
  const { ledger } = company;
  const totalExpenses = Object.values(ledger.expenses).reduce((sum, current) => sum + current, 0);
  const netProfit = ledger.revenue - totalExpenses;
  const daysElapsed = Math.max(1, ticks / 24);

  const operatingExpenses = (ledger.expenses.rent || 0) + (ledger.expenses.maintenance || 0) + (ledger.expenses.power || 0);
  const capitalExpenses = (ledger.expenses.structures || 0) + (ledger.expenses.devices || 0) + (ledger.expenses.supplies || 0) + (ledger.expenses.seeds || 0);

  return (
    <div className="finances-view">
      <div className="content-panel">
        <div className="content-panel__header">
          <h2>Financial Summary</h2>
        </div>
        <div className="summary-cards">
          <div className="summary-card">
            <h4>Total Revenue</h4>
            <p className="positive">{formatCurrency(ledger.revenue)}</p>
          </div>
          <div className="summary-card">
            <h4>Total Expenses</h4>
            <p className="negative">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className="summary-card">
            <h4>Net Profit/Loss</h4>
            <p className={netProfit >= 0 ? 'positive' : 'negative'}>{formatCurrency(netProfit)}</p>
          </div>
        </div>
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
                {['rent', 'maintenance', 'power'].map(cat => (
                    <tr key={cat}>
                        <td>&nbsp;&nbsp;&nbsp;{categoryNames[cat]}</td>
                        <td>{formatCurrency(ledger.expenses[cat] || 0)}</td>
                        <td>{formatCurrency((ledger.expenses[cat] || 0) / daysElapsed)}</td>
                    </tr>
                ))}
                 <tr style={{fontWeight: 'bold'}}>
                    <td>&nbsp;&nbsp;&nbsp;Total Operating</td>
                    <td>{formatCurrency(operatingExpenses)}</td>
                    <td>{formatCurrency(operatingExpenses / daysElapsed)}</td>
                </tr>


                <tr>
                    <td colSpan={3} style={{paddingTop: '2rem'}}><strong>Capital Expenditures</strong></td>
                </tr>
                 {['structures', 'devices', 'supplies', 'seeds'].map(cat => (
                    <tr key={cat}>
                        <td>&nbsp;&nbsp;&nbsp;{categoryNames[cat]}</td>
                        <td>{formatCurrency(ledger.expenses[cat] || 0)}</td>
                        <td>{formatCurrency((ledger.expenses[cat] || 0) / daysElapsed)}</td>
                    </tr>
                ))}
                 <tr style={{fontWeight: 'bold'}}>
                    <td>&nbsp;&nbsp;&nbsp;Total Capital</td>
                    <td>{formatCurrency(capitalExpenses)}</td>
                    <td>{formatCurrency(capitalExpenses / daysElapsed)}</td>
                </tr>
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default FinancesView;

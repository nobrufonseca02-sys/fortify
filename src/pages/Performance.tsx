import { useState } from 'react';
import { MOCK_ACCOUNTS } from '@/data/mockData';
import { AccountSelector } from '@/components/AccountSelector';
import { TradingAccount } from '@/types/fortify';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Generate mock performance data
function generateMockData(account: TradingAccount) {
  const days = 20;
  const data = [];
  let balance = account.startBalance;
  let equity = account.startBalance;
  let highWater = account.startBalance;

  for (let i = 0; i < days; i++) {
    const dailyPnl = (Math.random() - 0.4) * account.startBalance * 0.015;
    balance += dailyPnl;
    equity = balance + (Math.random() - 0.5) * account.startBalance * 0.005;
    highWater = Math.max(highWater, equity);
    const drawdown = highWater - equity;

    data.push({
      day: `D${i + 1}`,
      balance: Math.round(balance),
      equity: Math.round(equity),
      drawdown: Math.round(drawdown),
      dailyPnl: Math.round(dailyPnl),
    });
  }
  return data;
}

const Performance = () => {
  const [selectedAccount, setSelectedAccount] = useState<TradingAccount>(MOCK_ACCOUNTS[0]);
  const data = generateMockData(selectedAccount);

  const tooltipStyle = {
    contentStyle: {
      backgroundColor: 'hsl(220, 22%, 9%)',
      border: '1px solid hsl(220, 16%, 16%)',
      borderRadius: '8px',
      fontSize: '12px',
      fontFamily: 'JetBrains Mono, monospace',
    },
    labelStyle: { color: 'hsl(215, 15%, 50%)' },
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-bold text-foreground">Performance</h1>
        <p className="text-xs text-muted-foreground">Acompanhe a evolução da sua conta.</p>
      </div>

      <AccountSelector accounts={MOCK_ACCOUNTS} selected={selectedAccount} onSelect={setSelectedAccount} />

      {/* Equity Curve */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Curva de Equity</h2>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(187, 85%, 53%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(187, 85%, 53%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 16%)" />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(215, 15%, 50%)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(215, 15%, 50%)' }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
            <Tooltip {...tooltipStyle} formatter={(value: number) => [`$${value.toLocaleString('pt-BR')}`, '']} />
            <Area type="monotone" dataKey="equity" stroke="hsl(187, 85%, 53%)" fill="url(#eqGrad)" strokeWidth={2} name="Equity" />
            <Area type="monotone" dataKey="balance" stroke="hsl(152, 69%, 46%)" fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" name="Saldo" />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      {/* Drawdown */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Drawdown</h2>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 16%)" />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(215, 15%, 50%)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(215, 15%, 50%)' }} tickFormatter={v => `$${v.toLocaleString()}`} />
            <Tooltip {...tooltipStyle} formatter={(value: number) => [`$${value.toLocaleString('pt-BR')}`, 'Drawdown']} />
            <Area type="monotone" dataKey="drawdown" stroke="hsl(0, 72%, 51%)" fill="url(#ddGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </section>

      {/* Daily P&L */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Lucro Diário</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 16%, 16%)" />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(215, 15%, 50%)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(215, 15%, 50%)' }} tickFormatter={v => `$${v.toLocaleString()}`} />
            <Tooltip {...tooltipStyle} formatter={(value: number) => [`$${value.toLocaleString('pt-BR')}`, 'P&L']} />
            <Bar
              dataKey="dailyPnl"
              radius={[4, 4, 0, 0]}
              fill="hsl(187, 85%, 53%)"
            />
          </BarChart>
        </ResponsiveContainer>
      </section>
    </div>
  );
};

export default Performance;

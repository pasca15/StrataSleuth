
import React from 'react';
import { AnalysisResult } from '../types';
import { ICONS } from '../constants';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';

interface Props {
  data: AnalysisResult;
}

export const AnalysisDashboard: React.FC<Props> = ({ data }) => {
  const getRiskColor = (score: number) => {
    if (score > 70) return 'text-red-500';
    if (score > 40) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Risk Summary Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col items-center justify-center">
          <h3 className="text-zinc-500 text-sm font-semibold uppercase tracking-wider mb-2">Overall Risk Score</h3>
          <div className={`text-6xl font-bold ${getRiskColor(data.riskScore)}`}>
            {data.riskScore}<span className="text-2xl text-zinc-600">/100</span>
          </div>
          <div className="mt-4 text-center px-4">
            <p className="text-xs text-zinc-500 uppercase font-bold mb-1">Detective Verdict</p>
            <p className="text-zinc-300 font-medium italic">"{data.conclusion}"</p>
          </div>
        </div>

        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
          <div className="flex items-center space-x-2 mb-4">
            <div className="p-2 bg-red-500/10 text-red-500 rounded-lg"><ICONS.Alert /></div>
            <h3 className="font-bold text-zinc-200">Red Team Investor Briefing</h3>
          </div>
          <p className="text-zinc-400 leading-relaxed mono text-sm">
            {data.redTeamSummary}
          </p>
        </div>
      </div>

      {/* Financial War Gaming */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><ICONS.DollarSign /></div>
            <h3 className="font-bold text-zinc-200">10-Year Wallet Impact Forecast</h3>
          </div>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.financialWarGaming}>
              <defs>
                <linearGradient id="colorFund" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis dataKey="year" stroke="#4b5563" fontSize={12} />
              <YAxis stroke="#4b5563" fontSize={12} tickFormatter={(v) => `$${v/1000}k`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                itemStyle={{ fontSize: '12px' }}
              />
              <Area type="monotone" dataKey="fundBalance" stroke="#3b82f6" fillOpacity={1} fill="url(#colorFund)" name="Fund Balance" />
              <Area type="monotone" dataKey="expectedCost" stroke="#ef4444" fill="transparent" name="Expected Costs" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Ghost in the Walls Timeline */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
        <div className="flex items-center space-x-2 mb-6">
          <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg"><ICONS.Search /></div>
          <h3 className="font-bold text-zinc-200">The "Ghost in the Walls" Timeline</h3>
        </div>
        <div className="relative border-l border-zinc-800 ml-4 space-y-8 pb-4">
          {data.timeline.map((issue, idx) => (
            <div key={idx} className="relative pl-8">
              <div className={`absolute -left-[5px] top-0 w-[9px] h-[9px] rounded-full border-2 border-zinc-900 ${
                issue.severity === 'critical' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' :
                issue.severity === 'high' ? 'bg-orange-500' :
                'bg-zinc-600'
              }`} />
              <div className="flex flex-col md:flex-row md:items-baseline md:justify-between mb-1">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-tighter">Year {issue.year}</span>
                <span className="text-xs font-mono text-zinc-500">Estimated Cost: {typeof issue.cost === 'number' ? `$${issue.cost.toLocaleString()}` : issue.cost}</span>
              </div>
              <h4 className="text-zinc-200 font-bold mb-2">{issue.event}</h4>
              <p className="text-sm text-zinc-400 mb-2">{issue.description}</p>
              <div className="bg-zinc-950 p-3 rounded border border-zinc-800 text-xs text-zinc-500 italic">
                <span className="font-bold uppercase text-[10px] text-zinc-600 mr-2">Strata Action:</span>
                {issue.resolution}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lifestyle Collisions */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
        <div className="flex items-center space-x-2 mb-6">
          <div className="p-2 bg-green-500/10 text-green-500 rounded-lg"><ICONS.User /></div>
          <h3 className="font-bold text-zinc-200">Lifestyle Collision Engine</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.lifestyleConflicts.map((item, idx) => (
            <div key={idx} className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex flex-col">
              <span className="text-[10px] font-bold text-zinc-600 uppercase mb-2">Reference: {item.bylaw}</span>
              <p className="text-zinc-300 text-sm font-semibold mb-3 flex-grow">{item.conflict}</p>
              <div className="flex items-start space-x-2 bg-zinc-900 p-2 rounded border border-zinc-800">
                <div className="mt-0.5 text-blue-500 flex-shrink-0"><ICONS.Check /></div>
                <p className="text-xs text-zinc-500 leading-relaxed">{item.recommendation}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

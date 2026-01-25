
import React from 'react';
import { AnalysisResult, BriefingPoint } from '../types';
import { ICONS } from '../constants';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Legend
} from 'recharts';

interface Props {
  data: AnalysisResult;
}

const BriefingPointItem: React.FC<{ point: BriefingPoint }> = ({ point }) => {
  return (
    <li className="relative group pl-7 mb-4 last:mb-0 leading-relaxed text-zinc-400">
      <div className="absolute left-1 top-[0.6em] w-1.5 h-1.5 bg-blue-600 rounded-sm rotate-45 group-hover:bg-blue-400 transition-colors" />
      
      <span className={`transition-colors duration-200 ${point.source ? 'cursor-help group-hover:text-zinc-100' : ''}`}>
        {point.content}
      </span>

      {point.source && (
        <div className="absolute bottom-full left-0 mb-3 invisible group-hover:visible z-50 w-72 p-4 bg-zinc-950 border border-zinc-800 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] text-[11px] animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
            <span className="font-black text-zinc-500 uppercase tracking-widest">Evidence Source</span>
          </div>
          <div className="space-y-1">
            <span className="block text-zinc-200 font-bold leading-tight">{point.source.fileName}</span>
            <span className="inline-block px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[10px] font-bold">
              Page {point.source.pageNumber}
            </span>
          </div>
          <div className="absolute top-full left-6 border-l-[10px] border-r-[10px] border-t-[10px] border-l-transparent border-r-transparent border-t-zinc-800"></div>
        </div>
      )}
    </li>
  );
};

export const AnalysisDashboard: React.FC<Props> = ({ data }) => {
  const getRiskColor = (score: number) => {
    if (score > 7.5) return 'text-red-500';
    if (score > 4) return 'text-orange-400';
    return 'text-emerald-400';
  };

  // Filter for years where we actually have yield data
  const yieldData = data.financialWarGaming.filter(d => d.yieldImpactBestCase !== undefined || d.yieldImpactWorstCase !== undefined);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Level Risk & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl flex flex-col items-center justify-center text-center">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Risk Exposure Index</span>
          <div className={`text-7xl font-black ${getRiskColor(data.riskScore)}`}>{data.riskScore}</div>
          <div className="mt-6 border-t border-zinc-800 pt-4 w-full italic text-sm text-zinc-400">
            "{data.conclusion}"
          </div>
        </div>

        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
          <div className="flex items-center space-x-2 mb-6">
            <div className="p-2 bg-red-500/10 text-red-500 rounded-lg"><ICONS.Alert /></div>
            <h3 className="font-black text-xl text-zinc-200">Forensic Briefing</h3>
          </div>
          <ul className="font-mono text-sm space-y-2">
            {data.redTeamSummary.map((point, idx) => (
              <BriefingPointItem key={idx} point={point} />
            ))}
          </ul>
        </div>
      </div>

      {/* Yield Analysis for Investors */}
      {yieldData.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg"><ICONS.TrendingUp /></div>
              <h3 className="font-black text-xl text-zinc-200">5-Year Yield Erosion Forecast</h3>
            </div>
            <div className="mt-4 md:mt-0 p-3 bg-zinc-950 border border-zinc-800 rounded-xl max-w-sm">
              <p className="text-[10px] text-zinc-500 font-bold uppercase mb-1 flex items-center gap-1">
                <ICONS.Info /> Forensic Note: Data Horizon
              </p>
              <p className="text-[10px] text-zinc-400 leading-tight italic">
                Projections often show high variance from 2027 onwards because capital works fund forecasts and inflation volatility make long-term net yield modeling speculative beyond a 5-year window.
              </p>
            </div>
          </div>
          
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yieldData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="year" stroke="#4b5563" fontSize={12} />
                <YAxis stroke="#4b5563" fontSize={12} tickFormatter={v => `${v}%`} />
                <Tooltip cursor={{fill: '#27272a'}} contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid #27272a' }} />
                <Legend verticalAlign="top" height={36}/>
                <Bar dataKey="yieldImpactBestCase" fill="#10b981" name="Best Case (Net Yield)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="yieldImpactWorstCase" fill="#ef4444" name="Worst Case (Net Yield)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Rent vs Buy Forensic for Occupiers */}
      {data.rentVsBuy && (
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><ICONS.Home /></div>
              <h3 className="font-black text-xl text-zinc-200">10-Year Rent vs. Buy Trajectory</h3>
            </div>
            {data.rentVsBuy.comparablePropertyLink && (
              <a href={data.rentVsBuy.comparablePropertyLink} target="_blank" rel="noopener noreferrer" className="mt-2 md:mt-0 flex items-center space-x-2 text-[10px] text-blue-400 hover:text-blue-300 transition-colors uppercase font-bold tracking-widest">
                <ICONS.Link /> <span>View Comparable Rental Evidence</span>
              </a>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-2xl">
              <p className="text-[10px] text-zinc-500 font-bold uppercase mb-2">Current Monthly Burn</p>
              <p className="text-3xl font-black text-white">${data.rentVsBuy.monthlyOwnershipCost.toLocaleString()}</p>
              <p className="text-[10px] text-zinc-600 mt-2">Incl. Int, Strata, Rates</p>
            </div>
            <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-2xl">
              <p className="text-[10px] text-zinc-500 font-bold uppercase mb-2">Market Rent Equivalent</p>
              <p className="text-3xl font-black text-blue-400">${data.rentVsBuy.marketRentEquivalent.toLocaleString()}</p>
              <p className="text-[10px] text-zinc-600 mt-2">Verified via Search</p>
            </div>
            <div className="p-6 bg-zinc-950 border border-zinc-800 rounded-2xl">
              <p className="text-[10px] text-zinc-500 font-bold uppercase mb-2">10-Year Total Impact</p>
              <p className={`text-3xl font-black ${data.rentVsBuy.tenYearTotalDelta > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {data.rentVsBuy.tenYearTotalDelta > 0 ? '+' : '-'}${Math.abs(data.rentVsBuy.tenYearTotalDelta).toLocaleString()}
              </p>
              <p className="text-[10px] text-zinc-600 mt-2">Projected Difference</p>
            </div>
          </div>

          <div className="w-full h-[250px] mb-8">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.rentVsBuy.yearlyProjection}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="year" stroke="#4b5563" fontSize={12} tickFormatter={v => `Year ${v}`} />
                <YAxis stroke="#4b5563" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid #27272a' }} />
                <Legend verticalAlign="top" height={36}/>
                <Area type="monotone" dataKey="ownershipCost" stroke="#ffffff" fill="#ffffff05" name="Ownership Cost (Yr)" />
                <Area type="monotone" dataKey="estimatedRent" stroke="#3b82f6" fill="#3b82f611" name="Rent Equivalent (Yr)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Financial Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
          <div className="flex items-center space-x-2 mb-8">
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><ICONS.DollarSign /></div>
            <h3 className="font-black text-xl text-zinc-200">Sinking Fund vs. Liability Forecast</h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.financialWarGaming}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="year" stroke="#4b5563" fontSize={12} tickFormatter={v => `Year ${v}`} />
                <YAxis stroke="#4b5563" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: '1px solid #27272a' }} />
                <Area type="monotone" dataKey="fundBalance" stroke="#3b82f6" fill="#3b82f633" name="Sinking Fund" />
                <Area type="monotone" dataKey="expectedCost" stroke="#ef4444" fill="#ef444411" name="Repair Cost" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Amenity Forensics */}
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
          <div className="flex items-center space-x-2 mb-8">
            <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg"><ICONS.Tool /></div>
            <h3 className="font-black text-xl text-zinc-200">Asset Forensic Audit</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2">
            {data.amenities.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-xl">
                <div>
                  <p className="text-sm font-bold text-zinc-200">{item.name}</p>
                  <p className="text-[10px] text-zinc-500 uppercase">Condition: <span className="text-zinc-300">{item.condition}</span></p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono text-zinc-300">Replacement: Yr {item.forecastedMaintenanceYear}</p>
                  <p className="text-xs font-bold text-red-400">Est. {typeof item.estimatedCost === 'number' ? `$${item.estimatedCost.toLocaleString()}` : item.estimatedCost}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Issues Timeline */}
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
        <h3 className="font-black text-xl text-zinc-200 mb-8 flex items-center space-x-2">
          <div className="p-2 bg-orange-500/10 text-orange-500 rounded-lg"><ICONS.Search /></div>
          <span>Temporal Nightmare Simulation</span>
        </h3>
        <div className="space-y-6">
          {data.timeline.map((issue, idx) => (
            <div key={idx} className="group relative pl-6 border-l-2 border-zinc-800 hover:border-blue-500 transition-colors">
              <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-4 border-zinc-900 ${
                issue.severity === 'critical' ? 'bg-red-500' :
                issue.severity === 'high' ? 'bg-orange-500' :
                'bg-zinc-500'
              }`} />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                <span className="text-xs font-black text-zinc-500 uppercase">Year {issue.year} · {issue.event}</span>
                <span className="text-xs font-mono text-zinc-400">Impact: {issue.cost}</span>
              </div>
              <p className="text-zinc-300 text-sm mb-3">{issue.description}</p>
              <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-[11px] text-zinc-500">
                <span className="font-bold text-zinc-600 mr-2 uppercase">Resolution:</span> {issue.resolution}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

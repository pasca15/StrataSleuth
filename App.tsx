
import React, { useState } from 'react';
import { LifestyleProfile, UploadedFile, AnalysisResult, Persona } from './types';
import { FileUpload } from './components/FileUpload';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { analyzeProperty } from './services/geminiService';
import { ICONS } from './constants';

const App: React.FC = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [persona, setPersona] = useState<Persona>('occupier');
  const [lifestyle, setLifestyle] = useState<LifestyleProfile>({
    persona: 'occupier',
    occupier: {
      pets: '',
      hobbies: '',
      balconyDrying: false,
      soundproofingNeeds: '',
      sleepingHabits: 'Average Sleeper',
      hasMortgage: false,
      loanSize: '500000',
      interestRate: '6.1',
      propertyValue: '850000'
    },
    investor: {
      expectedRentalYield: '4.5',
      loanSize: '400000',
      interestRate: '6.2',
      airbnb: false,
      propertyValue: '800000'
    }
  });
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStartAnalysis = async () => {
    if (files.length === 0) {
      setError("Please upload at least one strata document.");
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    try {
      const report = await analyzeProperty(files, { ...lifestyle, persona });
      setResults(report);
    } catch (err: any) {
      console.error("Analysis Failed:", err);
      // Ensure error state is always a string to avoid [object Object] rendering
      const errorMsg = typeof err === 'string' ? err : err.message || JSON.stringify(err);
      setError(errorMsg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setResults(null);
    setFiles([]);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20 text-zinc-300">
      <nav className="sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-zinc-800/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]">
              <ICONS.Search />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Strata<span className="text-blue-500">Sleuth</span></h1>
          </div>
          {results && (
            <button onClick={reset} className="text-xs uppercase font-bold text-zinc-500 hover:text-white transition-colors">
              New Scan
            </button>
          )}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {!results ? (
          <div className="max-w-3xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
                Forensic <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-500">Property Audit</span>
              </h2>
              <p className="text-zinc-400 text-lg">Simulate 10 years of ownership to expose hidden liabilities.</p>
            </div>

            <section className="space-y-8">
              <div className="bg-zinc-900/40 border border-zinc-800 p-8 rounded-3xl">
                <div className="flex items-center space-x-3 text-white mb-6">
                  <ICONS.FileText />
                  <h3 className="font-bold text-xl">1. Strata Evidence</h3>
                </div>
                <FileUpload onFilesChange={setFiles} files={files} />
              </div>

              <div className="bg-zinc-900/40 border border-zinc-800 p-8 rounded-3xl">
                <div className="flex items-center space-x-3 text-white mb-6">
                  <ICONS.User />
                  <h3 className="font-bold text-xl">2. Mission Profile</h3>
                </div>
                
                <div className="flex p-1 bg-zinc-950 rounded-xl border border-zinc-800 mb-8">
                  <button 
                    onClick={() => setPersona('occupier')}
                    className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-lg font-bold transition-all ${persona === 'occupier' ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    <ICONS.Home /> <span>Owner/Occupier</span>
                  </button>
                  <button 
                    onClick={() => setPersona('investor')}
                    className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-lg font-bold transition-all ${persona === 'investor' ? 'bg-emerald-600 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    <ICONS.TrendingUp /> <span>Investor</span>
                  </button>
                </div>

                {persona === 'occupier' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 animate-in fade-in slide-in-from-left-2 duration-300">
                    {/* Row 1 */}
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Sleeping Habits</label>
                      <select className="w-full bg-zinc-950 border border-zinc-800 rounded-lg h-[50px] px-3 text-zinc-200 focus:border-blue-500 outline-none" value={lifestyle.occupier?.sleepingHabits} onChange={e => setLifestyle({...lifestyle, occupier: {...lifestyle.occupier!, sleepingHabits: e.target.value}})}>
                        <option value="Light Sleeper">Light Sleeper (Sensitive to sound)</option>
                        <option value="Average Sleeper">Average Sleeper</option>
                        <option value="Deep Sleeper">Deep Sleeper (Sleeps through anything)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Soundproofing Needs</label>
                      <input className="w-full bg-zinc-950 border border-zinc-800 rounded-lg h-[50px] px-3 text-zinc-200 focus:border-blue-500 outline-none" placeholder="e.g. Planning to replace floorboards" value={lifestyle.occupier?.soundproofingNeeds} onChange={e => setLifestyle({...lifestyle, occupier: {...lifestyle.occupier!, soundproofingNeeds: e.target.value}})} />
                    </div>

                    {/* Row 2 */}
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Pets</label>
                      <input className="w-full bg-zinc-950 border border-zinc-800 rounded-lg h-[50px] px-3 text-zinc-200 focus:border-blue-500 outline-none" placeholder="e.g. Medium dog, 15kg" value={lifestyle.occupier?.pets} onChange={e => setLifestyle({...lifestyle, occupier: {...lifestyle.occupier!, pets: e.target.value}})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Strata Rules</label>
                      <div className="flex items-center justify-between px-3.5 bg-zinc-950 border border-zinc-800 rounded-lg h-[50px]">
                        <label className="text-sm font-medium text-zinc-300">Dry clothes on balcony?</label>
                        <input type="checkbox" className="w-5 h-5 rounded border-zinc-800 text-blue-600 focus:ring-0 focus:ring-offset-0" checked={lifestyle.occupier?.balconyDrying} onChange={e => setLifestyle({...lifestyle, occupier: {...lifestyle.occupier!, balconyDrying: e.target.checked}})} />
                      </div>
                    </div>

                    {/* Row 3 */}
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Hobbies / Noise</label>
                      <input className="w-full bg-zinc-950 border border-zinc-800 rounded-lg h-[50px] px-3 text-zinc-200 focus:border-blue-500 outline-none" placeholder="e.g. Piano practice, Home workshop" value={lifestyle.occupier?.hobbies} onChange={e => setLifestyle({...lifestyle, occupier: {...lifestyle.occupier!, hobbies: e.target.value}})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Ownership Context</label>
                      <div className="flex items-center justify-between px-3.5 bg-zinc-950 border border-zinc-800 rounded-lg h-[50px]">
                        <label className="text-sm font-medium text-zinc-300">Is this property mortgaged?</label>
                        <input type="checkbox" className="w-5 h-5 rounded border-zinc-800 text-blue-600 focus:ring-0 focus:ring-offset-0" checked={lifestyle.occupier?.hasMortgage} onChange={e => setLifestyle({...lifestyle, occupier: {...lifestyle.occupier!, hasMortgage: e.target.checked}})} />
                      </div>
                    </div>

                    {lifestyle.occupier?.hasMortgage && (
                      <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-blue-500/5 border border-blue-500/20 rounded-2xl animate-in zoom-in-95 duration-200 mt-2">
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2 tracking-widest">Property Price ($)</label>
                          <input type="number" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg h-[50px] px-3 text-zinc-200 outline-none focus:border-blue-500" value={lifestyle.occupier?.propertyValue} onChange={e => setLifestyle({...lifestyle, occupier: {...lifestyle.occupier!, propertyValue: e.target.value}})} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2 tracking-widest">Loan Principal ($)</label>
                          <input type="number" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg h-[50px] px-3 text-zinc-200 outline-none focus:border-blue-500" value={lifestyle.occupier?.loanSize} onChange={e => setLifestyle({...lifestyle, occupier: {...lifestyle.occupier!, loanSize: e.target.value}})} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2 tracking-widest">Interest Rate (%)</label>
                          <input type="number" step="0.1" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg h-[50px] px-3 text-zinc-200 outline-none focus:border-blue-500" value={lifestyle.occupier?.interestRate} onChange={e => setLifestyle({...lifestyle, occupier: {...lifestyle.occupier!, interestRate: e.target.value}})} />
                        </div>
                        <div className="col-span-full pt-2">
                           <p className="text-[10px] text-zinc-500 italic">Enabling "Rent vs Buy" Forensic Comparison for the next 10 years.</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Estimated Property Value ($)</label>
                        <input type="number" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-zinc-200 focus:border-emerald-500 outline-none" value={lifestyle.investor?.propertyValue} onChange={e => setLifestyle({...lifestyle, investor: {...lifestyle.investor!, propertyValue: e.target.value}})} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Target Gross Rental Yield (%)</label>
                        <input type="number" step="0.1" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-zinc-200 focus:border-emerald-500 outline-none" value={lifestyle.investor?.expectedRentalYield} onChange={e => setLifestyle({...lifestyle, investor: {...lifestyle.investor!, expectedRentalYield: e.target.value}})} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Loan Principal ($)</label>
                        <input type="number" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-zinc-200 focus:border-emerald-500 outline-none" value={lifestyle.investor?.loanSize} onChange={e => setLifestyle({...lifestyle, investor: {...lifestyle.investor!, loanSize: e.target.value}})} />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Loan Interest Rate (%)</label>
                        <input type="number" step="0.1" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-zinc-200 focus:border-emerald-500 outline-none" value={lifestyle.investor?.interestRate} onChange={e => setLifestyle({...lifestyle, investor: {...lifestyle.investor!, interestRate: e.target.value}})} />
                      </div>
                      <div>
                         <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Investment Options</label>
                         <div className="flex items-center justify-between p-3.5 bg-zinc-950 border border-zinc-800 rounded-lg">
                           <label className="text-sm font-medium text-zinc-300">Planned Airbnb Usage?</label>
                           <input type="checkbox" className="w-5 h-5 rounded border-zinc-800 text-emerald-600 focus:ring-0 focus:ring-offset-0" checked={lifestyle.investor?.airbnb} onChange={e => setLifestyle({...lifestyle, investor: {...lifestyle.investor!, airbnb: e.target.checked}})} />
                         </div>
                      </div>
                      <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                        <p className="text-[10px] text-emerald-500 font-bold uppercase mb-1">Calculation Helper</p>
                        <p className="text-xs text-zinc-500">
                          Yield is calculated as (Annual Rent / Value). Required weekly rent for {lifestyle.investor?.expectedRentalYield}%: 
                          <span className="text-emerald-400 font-bold ml-1">
                            ${Math.round((Number(lifestyle.investor?.propertyValue || 0) * (Number(lifestyle.investor?.expectedRentalYield || 0)/100)) / 52)} /wk
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {error && <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-sm flex items-center space-x-2"><ICONS.Alert /> <span>{error}</span></div>}

              <button
                onClick={handleStartAnalysis}
                disabled={isAnalyzing || files.length === 0}
                className={`w-full py-4 font-bold rounded-2xl shadow-xl transition-all flex items-center justify-center space-x-2 ${isAnalyzing ? 'bg-zinc-800 text-zinc-500' : (persona === 'investor' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20')}`}
              >
                {isAnalyzing ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span>Running Forensic Simulation...</span>
                  </>
                ) : (
                  <span>Initiate Full Building Audit</span>
                )}
              </button>
            </section>
          </div>
        ) : (
          <AnalysisDashboard data={results} />
        )}
      </main>
    </div>
  );
};

export default App;

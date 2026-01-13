
import React, { useState } from 'react';
import { LifestyleProfile, UploadedFile, AnalysisResult } from './types';
import { FileUpload } from './components/FileUpload';
import { AnalysisDashboard } from './components/AnalysisDashboard';
import { analyzeProperty } from './services/geminiService';
import { ICONS } from './constants';

const App: React.FC = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [lifestyle, setLifestyle] = useState<LifestyleProfile>({
    pets: '',
    hobbies: '',
    usage: ''
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
      const report = await analyzeProperty(files, lifestyle);
      setResults(report);
    } catch (err: any) {
      setError(err.message || "Failed to analyze property. Please check your API key.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setResults(null);
    setFiles([]);
    setLifestyle({ pets: '', hobbies: '', usage: '' });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-zinc-800/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]">
              <ICONS.Search />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">Strata<span className="text-blue-500">Sleuth</span></h1>
          </div>
          {results && (
            <button 
              onClick={reset}
              className="text-xs uppercase font-bold text-zinc-500 hover:text-white transition-colors"
            >
              Start New Analysis
            </button>
          )}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {!results ? (
          <div className="max-w-2xl mx-auto space-y-12">
            {/* Hero Section */}
            <div className="text-center space-y-4">
              <h2 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
                Detect the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Hidden Nightmares</span>
              </h2>
              <p className="text-zinc-400 text-lg leading-relaxed">
                Strata reports are designed to be boring. We make them loud. 
                Upload your property documents and let our forensic agent simulate 10 years of ownership.
              </p>
            </div>

            {/* Ingestion Section */}
            <section className="space-y-8">
              <div className="space-y-6 bg-zinc-900/40 border border-zinc-800 p-8 rounded-3xl">
                <div className="flex items-center space-x-3 text-white mb-2">
                  <ICONS.FileText />
                  <h3 className="font-bold">Step 1: Forensic Ingestion</h3>
                </div>
                <FileUpload onFilesChange={setFiles} files={files} />
              </div>

              <div className="space-y-6 bg-zinc-900/40 border border-zinc-800 p-8 rounded-3xl">
                <div className="flex items-center space-x-3 text-white mb-2">
                  <ICONS.User />
                  <h3 className="font-bold">Step 2: Lifestyle Collision Profile</h3>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Your Pets</label>
                    <input 
                      type="text" 
                      placeholder="e.g., 25kg Golden Retriever"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-zinc-200 focus:outline-none focus:border-blue-500 transition-colors"
                      value={lifestyle.pets}
                      onChange={(e) => setLifestyle({...lifestyle, pets: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Hobbies & Noise</label>
                    <input 
                      type="text" 
                      placeholder="e.g., Drumming at night, loud surround sound"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-zinc-200 focus:outline-none focus:border-blue-500 transition-colors"
                      value={lifestyle.hobbies}
                      onChange={(e) => setLifestyle({...lifestyle, hobbies: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Usage Plan</label>
                    <input 
                      type="text" 
                      placeholder="e.g., Airbnb/Short-term rental while traveling"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-zinc-200 focus:outline-none focus:border-blue-500 transition-colors"
                      value={lifestyle.usage}
                      onChange={(e) => setLifestyle({...lifestyle, usage: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl flex items-start space-x-3 text-red-500 text-sm">
                  <ICONS.Alert />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleStartAnalysis}
                disabled={isAnalyzing || files.length === 0}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center space-x-2"
              >
                {isAnalyzing ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Running Forensic Simulation...</span>
                  </>
                ) : (
                  <span>Initiate Forensic Scan</span>
                )}
              </button>
            </section>
          </div>
        ) : (
          <AnalysisDashboard data={results} />
        )}
      </main>

      {/* Floating Action Bar for mobile/persistent access when viewing results */}
      {results && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center space-x-2 bg-zinc-900/90 backdrop-blur border border-zinc-800 p-2 rounded-full shadow-2xl">
          <button 
            onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}
            className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-full text-zinc-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
          </button>
          <div className="h-6 w-[1px] bg-zinc-800" />
          <div className="px-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">Property Report Ready</div>
        </div>
      )}
    </div>
  );
};

export default App;

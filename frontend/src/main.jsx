import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      <div className="crystal-card p-6 rounded-2xl text-slate-800 shadow-crystal">
        <h1 className="text-2xl font-bold">Crystal Video Downloader</h1>
      </div>
    </div>
  </React.StrictMode>
);

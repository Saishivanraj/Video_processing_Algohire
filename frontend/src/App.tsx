import { useState } from 'react';
import UploadVideo from './components/UploadVideo';
import VideoList from './components/VideoList';

function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Modern Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 bg-opacity-90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="text-xl font-bold text-gray-800 tracking-tight">Algo Hire</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <UploadVideo onUploadSuccess={() => setRefreshKey(k => k + 1)} />
        <div className="my-12 flex items-center gap-4">
          <div className="h-px bg-gray-200 flex-1"></div>
          <span className="text-gray-400 text-sm font-medium uppercase tracking-wider">Processing Queue</span>
          <div className="h-px bg-gray-200 flex-1"></div>
        </div>
        <VideoList refreshTrigger={refreshKey} />
      </main>
    </div>
  );
}

export default App;

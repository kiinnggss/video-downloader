import { useState, useEffect } from 'react';

export function useTelemetry() {
  const [activeTask, setActiveTask] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    const sse = new EventSource('/api/downloads/stream');
    sse.addEventListener('progress', (e) => {
      try {
        const data = JSON.parse(e.data);
        setActiveTask(data);
        setLastUpdate(Date.now());
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    });

    return () => sse.close();
  }, []);

  return { activeTask, lastUpdate };
}

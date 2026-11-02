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

        // Automatically trigger saving to device when finished
        if (data.status === 'finished' && data.file_id && !data.in_vault) {
          const downloadUrl = `/api/files/${data.file_id}/download`;
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.setAttribute('download', data.filename || 'video.mp4');
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    });

    return () => sse.close();
  }, []);

  return { activeTask, lastUpdate };
}

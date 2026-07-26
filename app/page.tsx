'use client';

import { ReactFlowProvider } from '@xyflow/react';
import { useEffect } from 'react';

import CompromiseCanvas from '@/components/compromise-canvas';

export default function Home() {
  useEffect(() => {
    document.title = 'Compromise Canvas';
  }, []);

  return (
    <ReactFlowProvider>
      <CompromiseCanvas />
    </ReactFlowProvider>
  );
}

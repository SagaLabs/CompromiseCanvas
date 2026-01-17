import { useCallback, useState } from 'react';
import { useReactFlow } from 'reactflow';
import { toPng } from 'html-to-image';
import { getNodesBounds } from 'reactflow';
import { ChevronDown, Download } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface DownloadButtonProps {
  canvasTitle?: string;
}

export default function DownloadButton({ canvasTitle }: DownloadButtonProps) {
  const { getNodes, getViewport } = useReactFlow();
  const [backgroundType, setBackgroundType] = useState<'dark' | 'transparent'>('dark');

  const addWatermark = (dataUrl: string, width: number, height: number, bgType: 'dark' | 'transparent'): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();
      
      canvas.width = width;
      canvas.height = height;
      
      img.onload = () => {
        // Draw the original image
        ctx.drawImage(img, 0, 0);
        
        // Add watermark
        const watermarkText = "Created by SagaLabs - Train as you fight";
        const fontSize = Math.max(12, Math.min(width, height) * 0.02); // Responsive font size
        const padding = fontSize * 1.5;
        
        ctx.font = `${fontSize}px Arial, sans-serif`;
        ctx.fillStyle = bgType === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        
        // Position watermark in bottom-right corner
        const x = width - padding;
        const y = height - padding;
        
        ctx.fillText(watermarkText, x, y);
        
        resolve(canvas.toDataURL('image/png'));
      };
      
      img.src = dataUrl;
    });
  };

  const onDownloadClick = useCallback((bgType: 'dark' | 'transparent') => {
    // Update the background type state
    setBackgroundType(bgType);
    
    const nodes = getNodes();
    if (nodes.length === 0) {
      alert("No diagram to export! Please add some nodes first.");
      return;
    }

    // Get the React Flow container
    const reactFlowElement = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!reactFlowElement) {
      alert("React Flow element not found!");
      return;
    }

    // Calculate the bounds of all nodes
    const nodesBounds = getNodesBounds(nodes);
    const viewport = getViewport();
    
    // Add margin around the nodes (10% of the diagram size)
    const margin = Math.max(nodesBounds.width, nodesBounds.height) * 0.1;
    const exportBounds = {
      x: nodesBounds.x - margin,
      y: nodesBounds.y - margin,
      width: nodesBounds.width + margin * 2,
      height: nodesBounds.height + margin * 2,
    };

    // Calculate the crop area in viewport coordinates
    const cropX = (exportBounds.x - viewport.x) / viewport.zoom;
    const cropY = (exportBounds.y - viewport.y) / viewport.zoom;
    const cropWidth = exportBounds.width / viewport.zoom;
    const cropHeight = exportBounds.height / viewport.zoom;

    toPng(reactFlowElement, {
      backgroundColor: bgType === 'dark' ? '#1a1a1a' : undefined,
      width: exportBounds.width,
      height: exportBounds.height,
      style: {
        width: `${exportBounds.width}px`,
        height: `${exportBounds.height}px`,
        transform: `translate(${-exportBounds.x}px, ${-exportBounds.y}px)`,
      },
    })
      .then((dataUrl) => {
        // Add watermark to the image with the correct background type
        return addWatermark(dataUrl, exportBounds.width, exportBounds.height, bgType);
      })
      .then((watermarkedDataUrl) => {
        const link = document.createElement('a');
        const bgSuffix = bgType === 'transparent' ? '-transparent' : '';
        link.download = `compromise-canvas${bgSuffix}-${new Date().toISOString().split('T')[0]}.png`;
        link.href = watermarkedDataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch((error) => {
        console.error('Export failed:', error);
        alert('Export failed. Please try again.');
      });
  }, [getNodes, canvasTitle]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shadow-lg z-10 border-blue-600"
          title="Download as PNG"
          style={{ position: 'relative', zIndex: 1000 }}
        >
          <Download className="h-4 w-4 mr-2" />
          Download Image
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onDownloadClick('dark')}>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-800 rounded mr-2"></div>
            Dark Background
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDownloadClick('transparent')}>
          <div className="flex items-center">
            <div className="w-4 h-4 border border-gray-300 rounded mr-2 bg-white"></div>
            Transparent Background
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 
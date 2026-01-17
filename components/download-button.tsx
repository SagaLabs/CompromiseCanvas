import { useCallback, useState } from 'react';
import { useReactFlow } from 'reactflow';
import { toPng } from 'html-to-image';
import { getNodesBounds } from 'reactflow';
import { ChevronDown, Download, Image as ImageIcon } from 'lucide-react';
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

const useDownloadImage = () => {
  const { getNodes } = useReactFlow();
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

    const nodesBounds = getNodesBounds(nodes);
    const padding = Math.max(40, Math.min(nodesBounds.width, nodesBounds.height) * 0.1);
    const imageWidth = Math.max(1, Math.ceil(nodesBounds.width + padding * 2));
    const imageHeight = Math.max(1, Math.ceil(nodesBounds.height + padding * 2));
    const translateX = -nodesBounds.x + padding;
    const translateY = -nodesBounds.y + padding;

    toPng(reactFlowElement, {
      backgroundColor: bgType === 'dark' ? '#1a1a1a' : undefined,
      width: imageWidth,
      height: imageHeight,
      style: {
        width: `${imageWidth}px`,
        height: `${imageHeight}px`,
        transform: `translate(${translateX}px, ${translateY}px) scale(1)`,
        transformOrigin: '0 0',
      },
    })
      .then((dataUrl) => {
        // Add watermark to the image with the correct background type
        return addWatermark(dataUrl, imageWidth, imageHeight, bgType);
      })
      .then((watermarkedDataUrl) => {
        const link = document.createElement('a');
        const bgSuffix = bgType === 'transparent' ? '-transparent' : '';
        link.download = `compromise-canvas-export${bgSuffix}-${new Date().toISOString().split('T')[0]}.png`;
        link.href = watermarkedDataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch((error) => {
        console.error('Export failed:', error);
        alert('Export failed. Please try again.');
      });
  }, [getNodes]);

  return { onDownloadClick };
};

export function DownloadImageMenuItems() {
  const { onDownloadClick } = useDownloadImage();

  return (
    <>
      <DropdownMenuItem onClick={() => onDownloadClick('dark')}>
        <ImageIcon className="mr-2 h-4 w-4" aria-hidden="true" />
        Download Image (Dark)
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onDownloadClick('transparent')}>
        <ImageIcon className="mr-2 h-4 w-4" aria-hidden="true" />
        Download Image (Transparent)
      </DropdownMenuItem>
    </>
  );
}

export default function DownloadButton({ canvasTitle }: DownloadButtonProps) {
  const { onDownloadClick } = useDownloadImage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shadow-lg z-10 border-blue-600"
          title="Download as PNG"
          style={{ position: 'relative', zIndex: 1000 }}
        >
          <Download className="h-4 w-4 mr-2" aria-hidden="true" />
          Download Image
          <ChevronDown className="h-4 w-4 ml-2" aria-hidden="true" />
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

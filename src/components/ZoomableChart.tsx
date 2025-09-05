
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2, ZoomIn, ZoomOut } from "lucide-react";

interface ZoomableChartProps {
  children: React.ReactNode;
  title: string;
}

const ZoomableChart = ({ children, title }: ZoomableChartProps) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };

  const resetZoom = () => {
    setZoomLevel(1);
  };

  return (
    <>
      <div className="relative group">
        <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoomLevel <= 0.5}
            className="p-1 h-8 w-8"
          >
            <ZoomOut className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoomLevel >= 3}
            className="p-1 h-8 w-8"
          >
            <ZoomIn className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMaximized(true)}
            className="p-1 h-8 w-8"
          >
            <Maximize2 className="h-3 w-3" />
          </Button>
        </div>
        <div 
          style={{ 
            transform: `scale(${zoomLevel})`, 
            transformOrigin: 'top left',
            transition: 'transform 0.2s ease-in-out'
          }}
        >
          {children}
        </div>
      </div>

      <Dialog open={isMaximized} onOpenChange={setIsMaximized}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-6">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              View a maximized and zoomable version of the chart.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">{title}</h3>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.5}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={resetZoom}
              >
                Reset
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMaximized(false)}
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div 
            className="w-full h-full overflow-auto"
            style={{ 
              transform: `scale(${zoomLevel})`, 
              transformOrigin: 'top left',
              transition: 'transform 0.2s ease-in-out'
            }}
          >
            <div style={{ height: '600px' }}>
              {children}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ZoomableChart;

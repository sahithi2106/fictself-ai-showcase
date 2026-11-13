import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, X, RefreshCw, ZoomIn, Eye, Sparkles } from 'lucide-react';

interface CoverImageUploaderProps {
  coverUrl: string;
  onChange: (url: string) => void;
  onRemove: () => void;
  onFileSelect?: (file: File) => void;
}

export default function CoverImageUploader({
  coverUrl,
  onChange,
  onRemove,
  onFileSelect
}: CoverImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [positionY, setPositionY] = useState(50); // percentage vertical alignment
  const [positionX, setPositionX] = useState(50); // percentage horizontal alignment
  const [isCroppingOpen, setIsCroppingOpen] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Unsupported file format. Please upload JPG, PNG, or WEBP.');
      return;
    }

    if (onFileSelect) {
      onFileSelect(file);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setLocalPreviewUrl(event.target.result as string);
        setIsCroppingOpen(true); // Open crop adjust settings immediately after successful upload
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4" id="cover-uploader-wrapper">
      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".jpg,.jpeg,.png,.webp"
        className="hidden"
        id="cover-file-input"
      />

      {(localPreviewUrl || coverUrl) ? (
        <div className="space-y-3">
          <div className="flex gap-4 items-start bg-[#141824] p-4 rounded-xl border border-slate-800">
            {/* Live Cropping Preview Context */}
            <div 
              className="relative aspect-[3/4] w-24 bg-slate-900 rounded-lg overflow-hidden border border-slate-700 shadow-md shrink-0 cursor-pointer group"
              onClick={() => setIsCroppingOpen(true)}
              title="Click to adjust frame/crop"
            >
              <img 
                src={localPreviewUrl || coverUrl} 
                alt="Cover Preview" 
                className="w-full h-full object-cover transition duration-300"
                style={{
                  transform: `scale(${zoom})`,
                  objectPosition: `${positionX}% ${positionY}%`
                }}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition duration-200">
                <span className="text-[10px] bg-slate-900/90 py-1 px-2 rounded-md font-bold text-violet-300 flex items-center gap-1">
                  <Eye size={10} /> Frame
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-2 min-w-0">
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles size={13} className="text-violet-400" />
                  Custom Cover Selected
                </h4>
                <p className="text-[10px] text-slate-400">Your custom image is loaded. Use the controls below to crop, refit, or remove it.</p>
              </div>

              <div className="flex flex-wrap gap-2 pt-1.5">
                <button
                  type="button"
                  onClick={() => setIsCroppingOpen(!isCroppingOpen)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold flex items-center gap-1 transition"
                  id="btn-adjust-crop"
                >
                  <RefreshCw size={11} />
                  Adjust Crop & Scale
                </button>
                <button
                  type="button"
                  onClick={triggerFileInput}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold transition"
                  id="btn-replace-image"
                >
                  Replace Cover
                </button>
                <button
                  type="button"
                  onClick={() => {
                      setLocalPreviewUrl(null);
                      onRemove();
                    }}
                  className="px-2.5 py-1 rounded bg-red-950/40 hover:bg-red-900/50 text-red-305 text-[10px] font-semibold flex items-center gap-1 transition border border-red-900/30"
                  id="btn-remove-image"
                >
                  <X size={11} />
                  Remove
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Crop & Resize Modal or Section */}
          {isCroppingOpen && (
            <div className="p-4 bg-slate-950/80 rounded-xl border border-violet-550/20 space-y-3 animate-fade-in" id="crop-section-controls">
              <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                <span className="text-[10px] font-bold text-violet-300 uppercase tracking-widest font-mono flex items-center gap-1">
                  <ZoomIn size={12} /> Crop & Scale Controls
                </span>
                <button 
                  type="button" 
                  onClick={() => setIsCroppingOpen(false)}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
                >
                  <X size={12} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Zoom range Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400 font-medium">Zoom & Scale ({zoom.toFixed(1)}x)</span>
                    <span className="text-slate-500">Drag to scale</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="2.5"
                    step="0.1"
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full accent-violet-500 bg-slate-900 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Vertical offset alignment */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400 font-medium">Vertical Alignment ({positionY}%)</span>
                    <span className="text-slate-500">Reposition frame</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={positionY}
                    onChange={(e) => setPositionY(parseInt(e.target.value))}
                    className="w-full accent-violet-500 bg-slate-900 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Horizontal offset alignment */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400 font-medium font-mono">Horizontal Alignment ({positionX}%)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={positionX}
                    onChange={(e) => setPositionX(parseInt(e.target.value))}
                    className="w-full accent-violet-300 bg-slate-900 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center gap-3 transition cursor-pointer select-none ${
            isDragging 
              ? 'border-violet-500 bg-violet-600/10 text-violet-300' 
              : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700 hover:bg-slate-900'
          }`}
          id="cover-dropzone"
        >
          <div className="p-3 bg-slate-950/80 rounded-full border border-slate-800 text-slate-350 shadow">
            <Upload size={18} />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-200">Upload Cover Image</p>
            <p className="text-[10px] text-slate-500">JPG, PNG, WEBP</p>
          </div>
        </div>
      )}
    </div>
  );
}

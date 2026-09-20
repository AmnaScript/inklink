import { useCallback, useEffect, useRef, useState } from 'react';
import { useSocket } from '../../hooks/useSocket';

type Point = { x: number; y: number };
type Stroke = { tool: 'pen' | 'eraser'; color: string; lineWidth: number; points: Point[]; isStart: boolean };

const CRAYONS = [
    { color: '#ef4444', name: 'Red' },
    { color: '#f97316', name: 'Orange' },
    { color: '#eab308', name: 'Yellow' },
    { color: '#22c55e', name: 'Green' },
    { color: '#3b82f6', name: 'Blue' },
    { color: '#7c3aed', name: 'Purple' },
    { color: '#000000', name: 'Black' },
];
const SIZES = [3, 6, 12, 24];

// Same per-corner-uneven technique as Home.tsx's cardWobble — reused here
// so the canvas frame reads as hand-drawn instead of a uniform rounded-2xl.
const canvasWobble = 'rounded-tl-[26px] rounded-tr-[14px] rounded-br-[30px] rounded-bl-[18px]';
const pillWobble = 'rounded-tl-[10px] rounded-tr-[14px] rounded-br-[10px] rounded-bl-[14px]';

export function DrawingCanvas({ roomId }: { roomId: string }) {
    const socket = useSocket();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [isDrawer, setIsDrawer] = useState(false);
    const [color, setColor] = useState('#000000');
    const [lineWidth, setLineWidth] = useState(6);
    const [tool, setTool] = useState<'pen' | 'eraser'>('pen');

    const isDrawingRef = useRef(false);
    const lastLocalPoint = useRef<Point | null>(null);
    const lastRemotePoint = useRef<Point | null>(null);

    const paint = useCallback((from: Point | null, to: Point, stroke: Stroke) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        const w = canvas.width;
        const h = canvas.height;

        ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
        ctx.fillStyle = ctx.strokeStyle;
        ctx.lineWidth = stroke.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (!from) {
            ctx.beginPath();
            ctx.arc(to.x * w, to.y * h, stroke.lineWidth / 2, 0, Math.PI * 2);
            ctx.fill();
            return;
        }
        ctx.beginPath();
        ctx.moveTo(from.x * w, from.y * h);
        ctx.lineTo(to.x * w, to.y * h);
        ctx.stroke();
    }, []);

    const clearCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, []);

    function getNormalisedPoint(clientX: number, clientY: number): Point | null {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        return {
            x: Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1),
            y: Math.min(Math.max((clientY - rect.top) / rect.height, 0), 1),
        };
    }

    function emitPoint(point: Point, isStart: boolean) {
        socket.emit('draw_stroke', { roomId, tool, color, lineWidth, points: [point], isStart });
    }

    function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
        if (!isDrawer) return;
        const point = getNormalisedPoint(e.clientX, e.clientY);
        if (!point) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        isDrawingRef.current = true;
        lastLocalPoint.current = point;
        paint(null, point, { tool, color, lineWidth, points: [point], isStart: true });
        emitPoint(point, true);
    }

    function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
        if (!isDrawer || !isDrawingRef.current) return;
        const point = getNormalisedPoint(e.clientX, e.clientY);
        if (!point) return;
        paint(lastLocalPoint.current, point, { tool, color, lineWidth, points: [point], isStart: false });
        lastLocalPoint.current = point;
        emitPoint(point, false);
    }

    function stopDrawing() {
        isDrawingRef.current = false;
        lastLocalPoint.current = null;
    }

    useEffect(() => {
        const handleRemoteDraw = (stroke: Stroke) => {
            const point = stroke.points?.[0];
            if (!point) return;
            if (stroke.isStart) lastRemotePoint.current = null;
            paint(lastRemotePoint.current, point, stroke);
            lastRemotePoint.current = point;
        };
        const handleCanvasState = ({ strokes }: { strokes: Stroke[] }) => {
            clearCanvas();
            let previous: Point | null = null;
            strokes.forEach((stroke) => {
                const point = stroke.points?.[0];
                if (!point) return;
                if (stroke.isStart) previous = null;
                paint(previous, point, stroke);
                previous = point;
            });
            lastRemotePoint.current = previous;
        };
        const handleRoundStarted = (data: { drawerSocketId: string }) => {
            setIsDrawer(data.drawerSocketId === socket.id);
            lastRemotePoint.current = null;
            clearCanvas();
        };
        const handleSelectionStarted = () => {
            setIsDrawer(false);
            lastRemotePoint.current = null;
            clearCanvas();
        };
        const handleRoundEnded = () => {
            setIsDrawer(false);
            stopDrawing();
        };
        const handleClear = () => {
            lastRemotePoint.current = null;
            clearCanvas();
        };

        socket.on('draw_stroke', handleRemoteDraw);
        socket.on('canvas_state', handleCanvasState);
        socket.on('round_started', handleRoundStarted);
        socket.on('your_turn', () => setIsDrawer(true));
        socket.on('selection_started', handleSelectionStarted);
        socket.on('round_ended', handleRoundEnded);
        socket.on('clear_canvas', handleClear);

        return () => {
            socket.off('draw_stroke', handleRemoteDraw);
            socket.off('canvas_state', handleCanvasState);
            socket.off('round_started', handleRoundStarted);
            socket.off('selection_started', handleSelectionStarted);
            socket.off('round_ended', handleRoundEnded);
            socket.off('clear_canvas', handleClear);
        };
    }, [socket, paint, clearCanvas]);

    return (
        // h-full so this component fills whatever space GameRoom's flex-1
        // wrapper gives it; min-h-0 lets the canvas row shrink instead of
        // pushing the toolbar off-screen.
        <div className="h-full w-full flex flex-col items-center gap-2 min-h-0">
            <div className="relative flex-1 min-h-0 w-full flex items-center justify-center">
                {/*
                  h-full + w-auto + aspect-[4/3]: the browser picks whichever
                  dimension the parent constrains (height, here) and derives
                  the other from the aspect ratio. That's what lets the
                  canvas shrink to fit a short viewport instead of forcing
                  a scrollbar — no JS resize logic needed.
                */}
                <canvas
                    ref={canvasRef}
                    width={800}
                    height={600}
                    className={`h-full w-auto max-w-full aspect-[4/3] ${canvasWobble} border-[3px] border-black
                                bg-[#fdfcf9] shadow-[6px_6px_0px_0px_#000] touch-none ${
                                    isDrawer ? 'cursor' : 'cursor'
                                }`}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={stopDrawing}
                    onPointerLeave={stopDrawing}
                    onPointerCancel={stopDrawing}
                />
                {!isDrawer && (
                    <span
                        className="absolute top-1 right-1 bg-white border-2 border-black rounded-full h-9 w-9
                                   flex items-center justify-center text-lg font-bold shadow-[2px_2px_0px_0px_#000] -rotate-6"
                    >
                        ?
                    </span>
                )}
            </div>

            {isDrawer && (
                <div className="shrink-0 flex flex-wrap items-center justify-center gap-3 py-1">
                    {CRAYONS.map((crayon) => (
                        <button
                            key={crayon.color}
                            onClick={() => {
                                setColor(crayon.color);
                                setTool('pen');
                            }}
                            title={crayon.name}
                            aria-label={crayon.name}
                            style={{ backgroundColor: crayon.color }}
                            className={`h-9 w-6 border-2 border-black
                                        [clip-path:polygon(50%_0%,85%_18%,85%_100%,15%_100%,15%_18%)]
                                        transition-transform hover:-translate-y-1
                                        ${color === crayon.color && tool === 'pen' ? 'scale-110 -translate-y-1' : ''}`}
                        />
                    ))}

                    <div className="flex items-center gap-1 ml-2">
                        {SIZES.map((size) => (
                            <button
                                key={size}
                                onClick={() => setLineWidth(size)}
                                className={`h-8 w-8 rounded-full border-2 bg-white flex items-center justify-center ${
                                    lineWidth === size ? 'border-blue-500' : 'border-black'
                                }`}
                                aria-label={`Brush size ${size}`}
                            >
                                <span
                                    className="rounded-full bg-black block"
                                    style={{ width: size / 2 + 3, height: size / 2 + 3 }}
                                />
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setTool(tool === 'eraser' ? 'pen' : 'eraser')}
                        className={`h-9 w-9 ${pillWobble} border-2 border-black flex items-center justify-center text-lg
                                    ${tool === 'eraser' ? 'bg-pink-200 -translate-y-1' : 'bg-white'}`}
                        title="Eraser"
                    >
                        🧼
                    </button>

                    <button
                        onClick={() => socket.emit('clear_canvas', { roomId })}
                        className={`h-9 px-3 ${pillWobble} border-2 border-black bg-white font-['Kalam',cursive] font-bold text-sm hover:bg-gray-100`}
                    >
                        Clear
                    </button>
                </div>
            )}
        </div>
    );
}
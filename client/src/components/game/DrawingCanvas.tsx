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

// How long we wait, after ONE finger touches down, before committing to a
// draw stroke — long enough for a second finger to reveal itself as part
// of the same gesture, short enough that a single-finger draw still feels
// instant. 60ms is the same order of magnitude iOS itself uses internally
// to disambiguate tap-vs-gesture.
const TOUCH_DISAMBIGUATION_MS = 60;

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
    const activeDrawPointerId = useRef<number | null>(null);

    // --- multi-touch bookkeeping -----------------------------------------
    // Raw client (pixel) position of every finger currently down on the
    // canvas, keyed by pointerId. Used both to know "how many fingers" and,
    // once a gesture is a scroll, to measure how far they've moved.
    const activeTouchPoints = useRef<Map<number, Point>>(new Map());
    // Mirrors activeTouchPoints.size — kept as its own ref only so the rest
    // of the logic below reads a bit more plainly.
    const activeTouchCount = useRef(0);
    // Set the instant a 2nd finger is detected; blocks all drawing until
    // every finger has lifted, so a gesture can never "become" a draw
    // partway through.
    const gestureAborted = useRef(false);
    // The first touch waits here until we're sure no second finger is
    // joining it.
    const pendingTouch = useRef<{ pointerId: number; point: Point } | null>(null);
    const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Average Y of all fingers as of the last move event, while a
    // multi-touch (scroll) gesture is in progress.
    const lastScrollYRef = useRef<number | null>(null);

    const clearPendingTouch = useCallback(() => {
        if (pendingTimer.current) {
            clearTimeout(pendingTimer.current);
            pendingTimer.current = null;
        }
        pendingTouch.current = null;
    }, []);

    const averageTouchY = useCallback(() => {
        const ys = Array.from(activeTouchPoints.current.values()).map((p) => p.y);
        return ys.reduce((sum, y) => sum + y, 0) / ys.length;
    }, []);

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

    function stopDrawing() {
        isDrawingRef.current = false;
        lastLocalPoint.current = null;
        activeDrawPointerId.current = null;
    }

    // The actual "put ink down" logic, shared by mouse/pen (immediate) and
    // touch (only called once the disambiguation delay has passed).
    function beginStroke(point: Point, pointerId: number) {
        canvasRef.current?.setPointerCapture(pointerId);
        activeDrawPointerId.current = pointerId;
        isDrawingRef.current = true;
        lastLocalPoint.current = point;
        paint(null, point, { tool, color, lineWidth, points: [point], isStart: true });
        emitPoint(point, true);
    }

    function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
        // Touch bookkeeping happens BEFORE the isDrawer check: a guesser
        // (non-drawer) still needs to be able to scroll the page with two
        // fingers on the canvas, even though they can never draw on it.
        if (e.pointerType === 'touch') {
            activeTouchPoints.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
            activeTouchCount.current = activeTouchPoints.current.size;

            if (activeTouchCount.current >= 2) {
                // A second finger just landed. Whatever the first finger was
                // about to do (pending or already-committed), cancel it —
                // this whole gesture is now a scroll, for its entire
                // duration, until every finger lifts.
                gestureAborted.current = true;
                clearPendingTouch();
                stopDrawing();
                lastScrollYRef.current = averageTouchY();
                return;
            }
        }

        if (!isDrawer) return;
        const point = getNormalisedPoint(e.clientX, e.clientY);
        if (!point) return;

        // Mouse and pen never have a "second finger" — draw immediately,
        // exactly as before. Only touch goes through the disambiguation wait.
        if (e.pointerType !== 'touch') {
            beginStroke(point, e.pointerId);
            return;
        }

        // First finger: don't draw yet. Wait briefly to see if a second
        // finger is about to join this same gesture.
        pendingTouch.current = { pointerId: e.pointerId, point };
        pendingTimer.current = setTimeout(() => {
            pendingTimer.current = null;
            const pending = pendingTouch.current;
            pendingTouch.current = null;
            // If a second finger arrived during the wait, gestureAborted
            // is already true and we must not draw.
            if (!pending || gestureAborted.current) return;
            beginStroke(pending.point, pending.pointerId);
        }, TOUCH_DISAMBIGUATION_MS);
    }

    function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
        if (e.pointerType === 'touch' && activeTouchPoints.current.has(e.pointerId)) {
            activeTouchPoints.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        }

        if (e.pointerType === 'touch' && gestureAborted.current) {
            // Multi-touch gesture in progress: drive the scroll manually,
            // since touch-none on the canvas stops the browser from ever
            // doing it natively. Never draw while this is true.
            if (activeTouchPoints.current.size >= 2) {
                const avgY = averageTouchY();
                if (lastScrollYRef.current !== null) {
                    window.scrollBy(0, lastScrollYRef.current - avgY);
                }
                lastScrollYRef.current = avgY;
            }
            return;
        }

        if (!isDrawer) return;
        if (e.pointerType === 'touch' && pendingTimer.current) return; // still disambiguating — ignore until confirmed
        if (!isDrawingRef.current || e.pointerId !== activeDrawPointerId.current) return;

        const point = getNormalisedPoint(e.clientX, e.clientY);
        if (!point) return;
        paint(lastLocalPoint.current, point, { tool, color, lineWidth, points: [point], isStart: false });
        lastLocalPoint.current = point;
        emitPoint(point, false);
    }

    function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
        if (e.pointerType === 'touch') {
            activeTouchPoints.current.delete(e.pointerId);
            activeTouchCount.current = activeTouchPoints.current.size;
            if (pendingTouch.current?.pointerId === e.pointerId) clearPendingTouch();
            if (activeTouchCount.current === 0) {
                // Only reset once every finger has lifted — otherwise a
                // remaining finger would suddenly start drawing from
                // wherever it happens to be, producing a stray stroke.
                gestureAborted.current = false;
                lastScrollYRef.current = null;
            }
        }
        if (e.pointerId === activeDrawPointerId.current) stopDrawing();
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
            clearPendingTouch();
            gestureAborted.current = false;
            activeTouchCount.current = 0;
            activeTouchPoints.current.clear();
            lastScrollYRef.current = null;
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
    }, [socket, paint, clearCanvas, clearPendingTouch]);

    return (
        <div className="h-full w-full flex flex-col items-center gap-2 min-h-0">
            <div className="relative flex-1 min-h-0 w-full flex items-center justify-center">
                <canvas
                    ref={canvasRef}
                    width={800}
                    height={600}
                    className={`h-full w-auto max-w-full aspect-[4/3] ${canvasWobble} border-[3px] border-black
                                bg-[#fdfcf9] shadow-[6px_6px_0px_0px_#000] touch-none ${
                                    isDrawer ? 'cursor-crosshair' : 'cursor-not-allowed'
                                }`}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    onPointerCancel={handlePointerUp}
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
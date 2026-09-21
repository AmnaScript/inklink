import { useEffect, useRef, useState } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { useSound } from '../../hooks/useSound';

export function Timer() {
    const socket = useSocket();
    const { play, stop } = useSound();
    const [timeLeft, setTimeLeft] = useState(0);
    // Tracks whether we've already started the tick sound for THIS
    // critical window, so play() fires once on entry, not once per second.
    const tickStartedRef = useRef(false);

    useEffect(() => {
        const handleTick = (data: { timeLeft: number }) => {
            const t = Math.max(data.timeLeft, 0);

            if (t <= 10 && t > 0 && !tickStartedRef.current) {
                play('tick');
                tickStartedRef.current = true;
            }
            if (t === 0) {
                stop('tick');
                tickStartedRef.current = false;
            }
            setTimeLeft(t);
        };
        const handleRoundStarted = (data: { timeLeft: number }) => {
            tickStartedRef.current = false;
            setTimeLeft(data.timeLeft);
        };
        const handleRoundEnded = () => {
            stop('tick');
            tickStartedRef.current = false;
            setTimeLeft(0);
        };

        socket.on('time_updated', handleTick);
        socket.on('round_started', handleRoundStarted);
        socket.on('round_ended', handleRoundEnded);
        return () => {
            socket.off('time_updated', handleTick);
            socket.off('round_started', handleRoundStarted);
            socket.off('round_ended', handleRoundEnded);
        };
    }, [socket, play, stop]);

    const isLow = timeLeft <= 10 && timeLeft > 0;
    const isCritical = timeLeft <= 5 && timeLeft > 0;

    return (
        <div className="flex items-center gap-1.5">
            <span
                key={isCritical ? timeLeft : 'idle'}
                className={`font-['Fredoka',sans-serif] font-bold text-4xl ${isLow ? 'text-red-600 animate-pulse' : 'text-slate-900'
                    } ${isCritical ? 'animate-shake' : ''}`}
            >
                {timeLeft}
            </span>
            <span className="text-3xl -rotate-6 select-none" style={isLow ? { animation: 'spin 0.6s linear infinite' } : undefined} aria-hidden>
                ⏱️
            </span>
        </div>
    );
}
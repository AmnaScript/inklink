import { useEffect, useState } from 'react';
import { useSocket } from '../../hooks/useSocket';

export function Timer() {
    const socket = useSocket();
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        const handleTick = (data: { timeLeft: number }) => setTimeLeft(Math.max(data.timeLeft, 0));
        const handleRoundStarted = (data: { timeLeft: number }) => setTimeLeft(data.timeLeft);
        const handleRoundEnded = () => setTimeLeft(0);

        socket.on('time_updated', handleTick);
        socket.on('round_started', handleRoundStarted);
        socket.on('round_ended', handleRoundEnded);
        return () => {
            socket.off('time_updated', handleTick);
            socket.off('round_started', handleRoundStarted);
            socket.off('round_ended', handleRoundEnded);
        };
    }, [socket]);

    const isLow = timeLeft <= 10 && timeLeft > 0;

    return (
        <div className="flex items-center gap-1.5">
            <span
                className={`font-['Fredoka',sans-serif] font-bold text-4xl ${
                    isLow ? 'text-red-600 animate-pulse' : 'text-slate-900'
                }`}
            >
                {timeLeft}
            </span>
            <span
                className="text-3xl -rotate-6 select-none"
                style={isLow ? { animation: 'spin 0.6s linear infinite' } : undefined}
                aria-hidden
            >
                ⏱️
            </span>
        </div>
    );
}
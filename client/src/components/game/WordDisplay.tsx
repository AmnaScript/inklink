import { useEffect, useState } from 'react';
import { useSocket } from '../../hooks/useSocket';

export function WordDisplay() {
    const socket = useSocket();
    const [display, setDisplay] = useState('');
    const [isSecret, setIsSecret] = useState(false);

    useEffect(() => {
        // The drawer gets the real word...
        const handleYourTurn = (data: { word: string }) => {
            setDisplay(data.word);
            setIsSecret(true);
        };

        // ...everyone else gets underscores, which is what makes it guessable.
        const handleRoundStarted = (data: { maskedWord: string; drawerSocketId: string }) => {
            if (data.drawerSocketId === socket.id) return;   // don't overwrite your_turn
            setDisplay(data.maskedWord);
            setIsSecret(false);
        };

        const handleRoundEnded = (data: { word: string }) => {
            setDisplay(data.word);
            setIsSecret(false);
        };

        const handleSelectionStarted = () => {
            setDisplay('');
            setIsSecret(false);
        };

        socket.on('your_turn', handleYourTurn);
        socket.on('round_started', handleRoundStarted);
        socket.on('round_ended', handleRoundEnded);
        socket.on('selection_started', handleSelectionStarted);

        return () => {
            socket.off('your_turn', handleYourTurn);
            socket.off('round_started', handleRoundStarted);
            socket.off('round_ended', handleRoundEnded);
            socket.off('selection_started', handleSelectionStarted);
        };
    }, [socket]);

    if (!display) return null;

    return (
        <div className="text-center">
            <p className="text-xs uppercase tracking-widest text-gray-500">
                {isSecret ? 'Draw this' : `Guess the word (${display.replace(/ /g, '').length} letters)`}
            </p>
            <h1 className="text-3xl font-bold tracking-[0.3em] text-slate-900">{display}</h1>
        </div>
    );
}
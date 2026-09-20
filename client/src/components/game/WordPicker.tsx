import { useEffect, useRef, useState } from 'react';
import { useSocket } from '../../hooks/useSocket';

// Same crayon palette as DrawingCanvas
const TILE_COLORS = ['bg-red-300', 'bg-yellow-300', 'bg-sky-300', 'bg-emerald-300', 'bg-purple-300'];
const TILE_ROTATIONS = ['-rotate-3', 'rotate-2', '-rotate-1'];

const cardWobble = 'rounded-tl-[30px] rounded-tr-[14px] rounded-br-[34px] rounded-bl-[18px]';
const tileWobble = 'rounded-tl-[18px] rounded-tr-[8px] rounded-br-[20px] rounded-bl-[10px]';

export function WordPicker({ roomId }: { roomId: string }) {
    const socket = useSocket();
    const [choices, setChoices] = useState<string[]>([]);
    const [waitingFor, setWaitingFor] = useState<string | null>(null);
    const [secondsLeft, setSecondsLeft] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        const startCountdown = (seconds: number) => {
            setSecondsLeft(seconds);
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = setInterval(() => {
                setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
            }, 1000);
        };
        const stopCountdown = () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = null;
            setSecondsLeft(0);
        };

        const handleChooseWord = (data: { randomWords: string[]; seconds: number }) => {
            setWaitingFor(null);
            setChoices(data.randomWords ?? []);
            startCountdown(data.seconds ?? 15);
        };
        const handleSelectionStarted = (data: { drawerName: string; drawerSocketId: string; seconds: number }) => {
            if (data.drawerSocketId === socket.id) return;
            setChoices([]);
            setWaitingFor(data.drawerName);
            startCountdown(data.seconds ?? 15);
        };
        const handleRoundStarted = () => {
            setChoices([]);
            setWaitingFor(null);
            stopCountdown();
        };

        socket.on('choose_word', handleChooseWord);
        socket.on('selection_started', handleSelectionStarted);
        socket.on('round_started', handleRoundStarted);
        socket.on('game_ended', handleRoundStarted);

        return () => {
            socket.off('choose_word', handleChooseWord);
            socket.off('selection_started', handleSelectionStarted);
            socket.off('round_started', handleRoundStarted);
            socket.off('game_ended', handleRoundStarted);
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [socket]);

    if (choices.length === 0 && !waitingFor) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 font-['Kalam',cursive]">
            <div
                className={`relative bg-[#fdfcf9] border-[3px] border-black ${cardWobble}
                            shadow-[8px_8px_0px_0px_#000] px-5 py-8 sm:px-8 sm:py-10 max-w-lg w-full text-center -rotate-1 mx-4`}
            >
                {/* Countdown badge */}
                <span
                    className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-yellow-300 border-[3px] border-black
                               flex items-center justify-center font-['Fredoka',sans-serif] font-bold text-lg sm:text-xl
                               shadow-[3px_3px_0px_0px_#000] rotate-6"
                >
                    {secondsLeft}s
                </span>

                {choices.length > 0 ? (
                    <>
                        <h2 className="font-['Fredoka',sans-serif] font-bold text-2xl sm:text-3xl text-slate-900 mb-4 sm:mb-6 px-2">
                            Choose a word!
                        </h2>
                        <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                            {choices.map((word, i) => (
                                <button
                                    key={word}
                                    onClick={() => {
                                        socket.emit('word_chosen', { roomId, chosenWord: word });
                                        setChoices([]);
                                    }}
                                    className={`px-4 py-3 sm:px-6 sm:py-4 border-[3px] border-black ${tileWobble} ${TILE_COLORS[i % TILE_COLORS.length]}
                                                ${TILE_ROTATIONS[i % TILE_ROTATIONS.length]}
                                                font-['Fredoka',sans-serif] font-bold text-base sm:text-lg text-black
                                                shadow-[4px_4px_0px_0px_#000]
                                                hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_#000]
                                                active:translate-y-0 active:shadow-[2px_2px_0px_0px_#000]
                                                transition-all break-words max-w-[45%]`}
                                >
                                    {word}
                                </button>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        <span className="text-4xl sm:text-5xl block mb-2 sm:mb-3" aria-hidden>
                            ✏️
                        </span>
                        <h2 className="font-['Fredoka',sans-serif] font-bold text-xl sm:text-2xl text-slate-900 px-2 break-words">
                            {waitingFor} is choosing a word...
                        </h2>
                    </>
                )}
            </div>
        </div>
    );
}
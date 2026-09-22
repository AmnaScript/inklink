import { useEffect, useState } from 'react';
import { useSocket } from '../../hooks/useSocket';
import { useSound } from '../../hooks/useSound';
import { Confetti } from './Confetti';

type Player = { socketId: string; username: string; score: number };

const REASON_TEXT: Record<string, string> = {
    timeout: "Time's up!",
    all_guessed: 'Everybody guessed it!',
    drawer_left: 'The drawer left.',
};

const cardWobble = 'rounded-tl-[30px] rounded-tr-[14px] rounded-br-[34px] rounded-bl-[18px]';
const rowWobble = 'rounded-tl-[12px] rounded-tr-[4px] rounded-br-[12px] rounded-bl-[4px]';

export function RoundEndScreen() {
    const socket = useSocket();
    const { play } = useSound();
    const [word, setWord] = useState<string | null>(null);
    const [reason, setReason] = useState<string>('timeout');
    const [players, setPlayers] = useState<Player[]>([]);

    useEffect(() => {
        const handleRoundEnd = (data: { word: string; reason: string; players: Player[] }) => {
            setWord(data.word);
            setReason(data.reason);
            setPlayers(data.players ?? []);
            if (data.reason === 'all_guessed') play('allGuessed');
            else if (data.reason === 'timeout') play('timeout');
            else play('roundEnd');
        };
        const handleDismiss = () => setWord(null);

        socket.on('round_ended', handleRoundEnd);
        socket.on('round_started', handleDismiss);
        socket.on('selection_started', handleDismiss);
        socket.on('game_ended', handleDismiss);

        return () => {
            socket.off('round_ended', handleRoundEnd);
            socket.off('round_started', handleDismiss);
            socket.off('selection_started', handleDismiss);
            socket.off('game_ended', handleDismiss);
        };
    }, [socket]);

    if (!word) return null;

    // const ranked = [...players].sort((a, b) => b.score - a.score);

    return (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4 font-['Kalam',cursive]">
            <div
                className={`relative bg-[#fdfcf9] border-[3px] border-black ${cardWobble} shadow-[8px_8px_0px_0px_#000]
                            px-8 py-8 max-w-md w-full text-center rotate-1 animate-pop-in`}
            >
                {/* {reason === 'all_guessed' && <Confetti />} */}

                <h1 className="font-['Fredoka',sans-serif] font-bold text-2xl sm:text-3xl text-slate-900 mb-2">
                    {REASON_TEXT[reason] ?? 'Round over!'}
                </h1>
                <p className="text-xl mb-6">
                    The word was:{' '}
                    <span className="font-['Fredoka',sans-serif] font-bold text-emerald-500 [-webkit-text-stroke:0.5px_black]">
                        {word}
                    </span>
                </p>

                {/* <ul className="flex flex-col gap-2 mb-6">
                    {ranked.map((player, i) => (
                        <li
                            key={player.socketId}
                            className={`flex items-center justify-between gap-2 bg-white border-2 border-black
                                        ${rowWobble} px-3 py-1.5 font-bold text-black shadow-[2px_2px_0px_0px_#000]
                                        ${i === 0 ? '-rotate-1' : i === 1 ? 'rotate-1' : '-rotate-1'}`}
                        >
                            <span>
                                {i === 0 && '🏆 '}
                                {player.username}
                            </span>
                            <span className="flex items-center gap-1">
                                {player.score}
                                <span aria-hidden>⭐</span>
                            </span>
                        </li>
                    ))}
                </ul> */}

                <p className="text-sm text-gray-500 italic">Next round starting...</p>
            </div>
        </div>
    );
}
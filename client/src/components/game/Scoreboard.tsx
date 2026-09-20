import { useEffect, useState } from 'react';
import { useSocket } from '../../hooks/useSocket';

type Player = { socketId: string; username: string; score: number; isDrawer: boolean };

const itemWobble = 'rounded-tl-[14px] rounded-tr-[6px] rounded-br-[14px] rounded-bl-[6px]';

export function Scoreboard({ onClose }: { onClose?: () => void }) {
    const socket = useSocket();
    const [players, setPlayers] = useState<Player[]>([]);
    const [guessed, setGuessed] = useState<string[]>([]);

    useEffect(() => {
        const handleRoomUpdate = (data: { players: Player[]; guessedPlayers: string[] }) => {
            setPlayers(data.players ?? []);
            setGuessed(data.guessedPlayers ?? []);
        };
        socket.on('room_updated', handleRoomUpdate);
        return () => {
            socket.off('room_updated', handleRoomUpdate);
        };
    }, [socket]);

    const ranked = [...players].sort((a, b) => b.score - a.score);

    return (
        <div
            className="h-full bg-emerald-200 border-r-[3px] border-black
                       rounded-tr-[38px] rounded-br-[12px]
                       p-4 flex flex-col gap-3 overflow-hidden relative shadow-[6px_0px_12px_-4px_rgba(0,0,0,0.4)] lg:shadow-none"
        >
            <div className="flex items-center justify-between shrink-0">
                <h2
                    className="flex-1 font-['Fredoka',sans-serif] font-bold text-3xl text-center text-pink-400
                               [-webkit-text-stroke:1.5px_black] -rotate-2"
                >
                    Players
                </h2>
                {/* Only meaningful on the mobile drawer — hidden entirely on
                    desktop where this panel is a permanent column. */}
                {onClose && (
                    <button
                        onClick={onClose}
                        className="lg:hidden h-8 w-8 shrink-0 rounded-full bg-white border-2 border-black
                                   flex items-center justify-center font-bold shadow-[2px_2px_0px_0px_#000]"
                        aria-label="Close players panel"
                    >
                        ✕
                    </button>
                )}
            </div>

            <ul className="flex flex-col gap-2">
                {ranked.map((player, i) => {
                    const hasGuessed = guessed.includes(player.socketId);
                    const isMe = player.socketId === socket.id;
                    return (
                        <li
                            key={player.socketId}
                            className={`flex items-center justify-between gap-2 bg-white border-2 border-black
                                        ${itemWobble} px-3 py-1.5 font-['Kalam',cursive] font-bold text-black
                                        shadow-[3px_3px_0px_0px_#000]
                                        ${i % 2 === 0 ? '-rotate-1' : 'rotate-1'}
                                        ${isMe ? 'ring-2 ring-yellow-400' : ''}`}
                        >
                            <span className="flex items-center gap-1 truncate">
                                {player.isDrawer && '✏️'}
                                {player.username}
                                {hasGuessed && <span className="text-emerald-600">✓</span>}
                            </span>
                            <span className="flex items-center gap-1 shrink-0">
                                {player.score}
                                <span aria-hidden>⭐</span>
                            </span>
                        </li>
                    );
                })}
            </ul>

            <div className="absolute bottom-2 left-2 text-2xl -rotate-12 select-none pointer-events-none" aria-hidden>
                🖍️
            </div>
        </div>
    );
}
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import { DrawingCanvas } from '../components/game/DrawingCanvas';
import { WordDisplay } from '../components/game/WordDisplay';
import { Timer } from '../components/game/Timer';
import { ChatBox } from '../components/game/ChatBox';
import { Scoreboard } from '../components/game/Scoreboard';
import { RoundEndScreen } from '../components/game/RoundEndScreen';
import { WordPicker } from '../components/game/WordPicker';
import { scribbleBackgroundClass } from '../components/game/scribbleBackground';
import { useSound, preloadSounds, playMusic } from '../hooks/useSound';
import { Confetti } from '../components/game/Confetti';

type Player = { socketId: string; username: string; score: number };

type RoomState = {
    hostId: string;
    status: 'waiting' | 'selecting' | 'playing' | 'ended' | 'finished';
    round: number;
    maxRounds: number;
    players: Player[];
};

const cardWobble = 'rounded-tl-[34px] rounded-tr-[16px] rounded-br-[38px] rounded-bl-[20px]';
const rowWobble = 'rounded-tl-[12px] rounded-tr-[4px] rounded-br-[12px] rounded-bl-[4px]';

export function GameRoom() {
    const socket = useSocket();
    const { play } = useSound();
    const navigate = useNavigate();
    const { roomId } = useParams();

    const [room, setRoom] = useState<RoomState | null>(null);
    const [finalScores, setFinalScores] = useState<Player[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    function handleCopyRoomId() {
        if (!roomId) return;
        navigator.clipboard.writeText(roomId);
        setCopied(true);
        play('uiClick');

        // Hide the "Copied!" message after 2 seconds
        setTimeout(() => {
            setCopied(false);
        }, 2000);
    }

    // Drawer open/closed state — only matters below the `lg` breakpoint.
    // On large screens both panels are always visible (CSS overrides these
    // classes via lg: prefixes below), so this state is simply unused there.
    const [playersOpen, setPlayersOpen] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);

    useEffect(() => {
        if (!roomId) return;
        const username = sessionStorage.getItem('inklink_username');
        if (!username) {
            navigate('/');
            return;
        }
        socket.emit('join_room', { roomId, username });
        preloadSounds();
        playMusic('lobby');

        const handleRoomUpdate = (data: RoomState) => {
            setRoom(data);
            if (data.status !== 'finished') setFinalScores(null);
        };
        const handleGameEnded = (data: { players: Player[] }) => {
            setFinalScores(data.players)
            const topScore = data.players[0]?.score ?? 0;
            const me = data.players.find((p) => p.socketId === socket.id);
            if (me) play(me.score === topScore ? 'win' : 'lose');

        };
        const handleError = (data: { message: string }) => setError(data.message);
        const handleConnect = () => socket.emit('join_room', { roomId, username });

        socket.on('room_updated', handleRoomUpdate);
        socket.on('game_ended', handleGameEnded);
        socket.on('room_error', handleError);
        socket.on('connect', handleConnect);

        return () => {
            socket.off('room_updated', handleRoomUpdate);
            socket.off('game_ended', handleGameEnded);
            socket.off('room_error', handleError);
            socket.off('connect', handleConnect);
        };
    }, [socket, roomId, navigate]);

    useEffect(() => {
        if (!room) return;
        playMusic(room.status === 'playing' ? 'game' : 'lobby');
    }, [room?.status]);

    if (!roomId) return <div>Room not found</div>;

    const isHost = room?.hostId === socket.id;
    const canStart = room?.status === 'waiting' || room?.status === 'ended' || room?.status === 'finished';
    const enoughPlayers = (room?.players.length ?? 0) >= 2;
    const totalRounds = room ? room.maxRounds * Math.max(room.players.length, 1) : 0;
    const closeDrawers = () => {
        setPlayersOpen(false);
        setChatOpen(false);
    };

    return (
        <div className={`h-screen font-['Kalam',cursive] overflow-hidden ${scribbleBackgroundClass}`}>
            <div className="flex h-full relative">
                {/* Backdrop — only rendered (and only intercepts clicks) while a
                    drawer is open, and only exists below lg since large
                    screens never open a drawer in the first place. */}
                {(playersOpen || chatOpen) && (
                    <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={closeDrawers} />
                )}

                {/*
                  Mobile (below lg): `fixed` takes this out of flex flow
                  entirely and slides it in/out with `translate-x`, so it
                  overlays the page instead of squeezing the middle column.
                  Desktop (lg and up): `lg:static lg:translate-x-0` puts it
                  back in normal flow as a permanent column, exactly like
                  before — the drawer classes simply stop applying.
                */}
                <div
                    className={`fixed inset-y-0 left-0 z-30 w-72 transition-transform duration-300 ease-out
                                lg:static lg:z-auto lg:w-64 lg:shrink-0 lg:translate-x-0
                                ${playersOpen ? 'translate-x-0' : '-translate-x-full'}`}
                >
                    <Scoreboard onClose={() => setPlayersOpen(false)} />
                </div>

                <div className="flex-1 flex flex-col items-center gap-2 px-3 sm:px-4 py-3 h-full min-h-0 min-w-0">
                    {/* Mobile-only toggle row for the two drawers */}
                    <div className="w-full max-w-3xl flex items-center justify-between shrink-0 lg:hidden">
                        <button
                            onClick={() => setPlayersOpen(true)}
                            className="rounded-full bg-emerald-200 border-2 border-black px-3 py-1
                                       font-['Fredoka',sans-serif] font-bold text-sm shadow-[2px_2px_0px_0px_#000]"
                        >
                            👥 Players
                        </button>
                        <button
                            onClick={() => setChatOpen(true)}
                            className="rounded-full bg-sky-200 border-2 border-black px-3 py-1
                                       font-['Fredoka',sans-serif] font-bold text-sm shadow-[2px_2px_0px_0px_#000]"
                        >
                            💬 Chat
                        </button>
                    </div>

                    <div className="w-full max-w-3xl flex flex-wrap items-center justify-between gap-2 shrink-0">
                        <div className="relative group inline-block">
                            {/* 1. Hover Tooltip */}


                            {/* 2. The Clickable Element */}
                            <span
                                onClick={handleCopyRoomId}
                                className="bg-white border-2 border-dashed border-blue-500 rounded-full px-3 sm:px-4 py-1
                   font-['Fredoka',sans-serif] font-bold text-blue-600 text-sm sm:text-base -rotate-1
                   shadow-[2px_2px_0px_0px_#000] truncate max-w-[45%] cursor-pointer hover:bg-blue-50 transition-colors select-none"
                            >
                                Room: {roomId}
                            </span>
                            <div className="absolute left-1/2 top-full mt-2 -translate-x-1/2 scale-95 opacity-0 pointer-events-none group-hover:scale-100 group-hover:opacity-100 transition-all duration-200 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                                Click to copy
                            </div>

                            {/* 3. Success Message (Shows when copied is true) */}
                            {copied && (
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-green-500 text-white text-xs font-bold rounded py-1 px-2 whitespace-nowrap shadow-lg z-10 animate-bounce">
                                    Copied to clipboard!
                                </div>
                            )}
                        </div>

                        {room && room.round > 0 && (
                            <span className="font-['Fredoka',sans-serif] font-semibold text-slate-800 text-sm sm:text-lg">
                                Round {room.round} / {totalRounds}
                            </span>
                        )}

                        <Timer />
                    </div>

                    <div className="shrink-0">
                        <WordDisplay />
                    </div>

                    {error && (
                        <p className="shrink-0 text-sm font-bold text-red-600 bg-red-100 border-2 border-red-400 rounded-full px-3 py-1">
                            {error}
                        </p>
                    )}

                    {isHost && canStart && (
                        <button
                            onClick={() => { play('uiClick'); socket.emit('start_round', { roomId }) }}
                            disabled={!enoughPlayers}
                            className="shrink-0 rounded-full bg-emerald-400 hover:bg-emerald-300 border-2 border-black
                                       px-5 sm:px-6 py-2 font-['Fredoka',sans-serif] font-bold text-black text-sm sm:text-base
                                       shadow-[3px_3px_0px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5
                                       hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {enoughPlayers ? 'Start Game' : 'Waiting for another player...'}
                        </button>
                    )}

                    {!isHost && room?.status === 'waiting' && (
                        <span className="shrink-0 bg-gray-200 border-2 border-black rounded-full px-4 py-1.5 font-bold text-gray-700 text-sm sm:text-base">
                            Waiting for another player...
                        </span>
                    )}

                    <div className="flex-1 min-h-0 w-full flex items-center justify-center">
                        <DrawingCanvas roomId={roomId} />
                    </div>
                </div>

                <div
                    className={`fixed inset-y-0 right-0 z-30 w-72 transition-transform duration-300 ease-out
                                lg:static lg:z-auto lg:shrink-0 lg:translate-x-0
                                ${chatOpen ? 'translate-x-0' : 'translate-x-full'}`}
                >
                    <ChatBox roomId={roomId} onClose={() => setChatOpen(false)} />
                </div>
            </div>

            <WordPicker roomId={roomId} />
            <RoundEndScreen />

            {finalScores && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 font-['Kalam',cursive]">
                    <div
                        className={`relative bg-[#fdfcf9] border-[3px] border-black ${cardWobble} shadow-[10px_10px_0px_0px_#000]
                                    px-6 sm:px-8 py-8 sm:py-10 max-w-md w-full text-center -rotate-1`}
                    >
                        <Confetti />
                        <h1 className="font-['Fredoka',sans-serif] font-bold text-3xl sm:text-5xl text-slate-900 mb-1 pb-5">
                            Game Over
                        </h1>

                        <ul className="flex flex-col gap-2 mb-8">
                            {finalScores.map((player, i) => (
                                <li
                                    key={player.socketId}
                                    className={`flex items-center justify-between gap-2 border-2 border-black
                                                ${rowWobble} px-3 py-2 font-bold text-black shadow-[2px_2px_0px_0px_#000]
                                                ${i === 0 ? 'bg-yellow-200 -rotate-1 scale-105' : i === 1 ? 'bg-gray-100 rotate-1' : 'bg-orange-100 -rotate-1'}`}
                                >
                                    <span className="truncate">
                                        {i === 0 ? '🏆 ' : `${i + 1}. `}
                                        {player.username}
                                    </span>
                                    <span className="flex items-center gap-1 shrink-0">
                                        {player.score}
                                        <span aria-hidden>⭐</span>
                                    </span>
                                </li>
                            ))}
                        </ul>

                        {isHost && (
                            <button
                                onClick={() => { play('uiClick'); socket.emit('start_round', { roomId }) }}
                                className="rounded-full bg-blue-500 hover:bg-blue-400 border-[3px] border-black
                                           px-8 py-3 font-['Fredoka',sans-serif] font-bold text-white text-lg sm:text-xl
                                           shadow-[4px_4px_0px_0px_#000] hover:translate-x-0.5 hover:translate-y-0.5
                                           hover:shadow-none transition-all"
                            >
                                Play Again
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
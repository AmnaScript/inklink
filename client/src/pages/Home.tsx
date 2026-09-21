import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../hooks/useSocket';
import doodleBackground from '../assets/eb97e98cd0bd2b2f8658c24d25b1c4ae.jpg';
import { useSound } from '../hooks/useSound';


// Fonts used below via arbitrary values (font-['Bangers'] etc.) — add to
// index.html <head>, no tailwind.config.js changes needed:
// <link href="https://fonts.googleapis.com/css2?family=Bangers&family=Kalam:wght@400;700&display=swap" rel="stylesheet">

export function Home() {
    const socket = useSocket();
    const { play } = useSound();
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [error, setError] = useState('');
    const [pending, setPending] = useState(false);

    function handleCreateRoom() {
        play('uiClick');
        if (!username.trim()) {
            setError('Please enter a username');
            return;
        }
        setError('');
        setPending(true);
        sessionStorage.setItem('inklink_username', username.trim());
        socket.emit('create_room', { username: username.trim() });
    }

    function handleJoinRoom() {
        play('uiClick');
        if (!username.trim() || !roomCode.trim()) {
            setError('Please enter a username and a room code');
            return;
        }
        setError('');
        setPending(true);
        sessionStorage.setItem('inklink_username', username.trim());
        socket.emit('join_room', { roomId: roomCode.trim(), username: username.trim() });
    }

    useEffect(() => {
        const handleJoined = (data: { roomId: string }) => {
            setPending(false);
            navigate('/room/' + data.roomId);
        };
        const handleError = (data: { message: string }) => {
            setPending(false);
            setError(data.message);
        };

        socket.on('room_joined', handleJoined);
        socket.on('room_error', handleError);

        return () => {
            socket.off('room_joined', handleJoined);
            socket.off('room_error', handleError);
        };
    }, [socket, navigate]);

    // Reused values as plain strings so every element stays visually
    // consistent. Once we confirm the config actually builds, these can
    // move back into tailwind.config.js as named utilities — but bracket
    // syntax works with zero setup, so it's the right first step.
    const inkShadow = 'shadow-[4px_4px_0px_0px_#000]';
    const inkShadowLg = 'shadow-[8px_8px_0px_0px_#000]';
    const wobbly1 = 'rounded-[255px_15px_225px_15px/15px_225px_15px_255px]';
    const wobbly2 = 'rounded-[15px_255px_15px_225px/225px_15px_255px_15px]';

    return (
        <div
            className="min-h-screen bg-[#faf8f5] font-['Kalam',cursive] flex flex-col items-center justify-center p-4 relative overflow-y-auto select-none"
            style={{ backgroundImage: `url(${doodleBackground})` }}
        >
            {/* Main Card Container */}
            <div
                className={`w-full max-w-md bg-white border-[3px] border-black ${wobbly1} ${inkShadowLg} p-6 sm:p-8 flex flex-col items-center gap-4 sm:gap-5 relative my-8`}
            >
                {/* Title */}
                <div className="text-center relative mb-2">
                    <h1 className="font-['Bangers',cursive] text-5xl sm:text-6xl tracking-wider text-cyan-300 drop-shadow-[3px_3px_0_#000] -rotate-2">
                        Ink<span className="text-pink-400">Link</span>
                    </h1>
                    <span
                        className={`absolute -top-2 -right-10 bg-yellow-300 text-black border-2 border-black text-xs font-bold px-2 py-0.5 rounded-full rotate-12 ${inkShadow}`}
                    >
                        Doodle
                    </span>
                </div>

                {/* Dynamic Error Banner */}
                {error && (
                    <div
                        className={`w-full bg-red-100 border-2 border-red-500 text-red-600 font-bold px-3 py-1.5 ${wobbly2} text-center text-sm -rotate-1 ${inkShadow}`}
                    >
                        ⚠️ {error}
                    </div>
                )}

                {/* Username Input */}
                <input
                    type="text"
                    placeholder="Username"
                    className={`w-full px-4 py-3 bg-amber-50/60 border-[3px] border-black ${wobbly2} text-lg font-semibold text-black placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-yellow-300 transition-all ${inkShadow}`}
                    value={username}
                    maxLength={20}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={pending}
                />

                {/* Create Room Button */}
                <button
                    onClick={handleCreateRoom}
                    disabled={pending}
                    className={`w-full py-3.5 bg-emerald-400 hover:bg-emerald-300 text-black text-xl font-bold border-[3px] border-black ${wobbly1} ${inkShadow} hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none active:translate-x-1 active:translate-y-1 transition-all -rotate-1 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {pending ? 'Connecting...' : 'Create Room'}
                </button>

                {/* Divider */}
                <div className="w-full flex items-center my-0.5">
                    <div className="flex-grow border-t-2 border-dashed border-black" />
                    <span className="px-3 py-0.5 text-black font-bold text-sm uppercase tracking-widest bg-yellow-200 border-2 border-black rounded-full mx-2 -rotate-3 shadow-[4px_4px_0px_0px_#000]">
                        or
                    </span>
                    <div className="flex-grow border-t-2 border-dashed border-black" />
                </div>

                {/* Room Code Input */}
                <input
                    type="text"
                    placeholder="Room code"
                    className={`w-full px-4 py-3 bg-blue-50/60 border-[3px] border-black ${wobbly1} text-lg font-semibold text-black placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-blue-300 transition-all ${inkShadow} uppercase tracking-wider`}
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                    disabled={pending}
                />

                {/* Join Room Button */}
                <button
                    onClick={handleJoinRoom}
                    disabled={pending}
                    className={`w-full py-3.5 bg-blue-500 hover:bg-blue-400 text-white text-xl font-bold border-[3px] border-black ${wobbly2} ${inkShadow} hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none active:translate-x-1 active:translate-y-1 transition-all rotate-1 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {pending ? 'Joining...' : 'Join Room'}
                </button>
            </div>
        </div>
    );
}
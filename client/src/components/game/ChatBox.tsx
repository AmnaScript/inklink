import { useEffect, useRef, useState } from 'react';
import { useSocket } from '../../hooks/useSocket';

type Message = { username: string; text: string; isSystem?: boolean; isCorrect?: boolean };

const bubbleWobble = 'rounded-tl-[12px] rounded-tr-[6px] rounded-br-[12px] rounded-bl-[6px]';
const inputWobble = 'rounded-tl-[16px] rounded-tr-[8px] rounded-br-[16px] rounded-bl-[8px]';

export function ChatBox({ roomId, onClose }: { roomId: string; onClose?: () => void }) {
    const socket = useSocket();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);

    function handleInputSend() {
        const text = inputText.trim();
        if (!text) return;
        socket.emit('chat_message', { roomId, message: text });
        setInputText('');
    }

    useEffect(() => {
        const handleChat = (data: { username: string; message: string; isSystem?: boolean; isCorrect?: boolean }) => {
            setMessages((prev) => [
                ...prev.slice(-199),
                { username: data.username, text: data.message, isSystem: data.isSystem ?? false, isCorrect: data.isCorrect ?? false },
            ]);
        };
        const handleRoundStarted = () => setMessages([]);

        socket.on('chat_message', handleChat);
        socket.on('round_started', handleRoundStarted);
        return () => {
            socket.off('chat_message', handleChat);
            socket.off('round_started', handleRoundStarted);
        };
    }, [socket]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    return (
        <div
            className="h-full bg-sky-200 border-l-[3px] border-black
                       rounded-tl-[38px] rounded-bl-[12px]
                       p-4 flex flex-col gap-3 shadow-[-6px_0px_12px_-4px_rgba(0,0,0,0.4)] lg:shadow-none"
        >
            <div className="flex items-center justify-between shrink-0">
                {onClose && (
                    <button
                        onClick={onClose}
                        className="lg:hidden h-8 w-8 shrink-0 rounded-full bg-white border-2 border-black
                                   flex items-center justify-center font-bold shadow-[2px_2px_0px_0px_#000]"
                        aria-label="Close chat panel"
                    >
                        ✕
                    </button>
                )}
                <h2
                    className="flex-1 font-['Fredoka',sans-serif] font-bold text-3xl text-center text-emerald-500
                               [-webkit-text-stroke:1.5px_black] rotate-2 flex items-center justify-center gap-1"
                >
                    Chat <span aria-hidden>💬</span>
                </h2>
                {/* spacer to balance the close button so the title stays centered */}
                {onClose && <span className="lg:hidden h-8 w-8 shrink-0" />}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto bg-white border-2 border-black rounded-tl-[20px] rounded-br-[20px] p-2 space-y-1">
                {messages.map((msg, index) => {
                    if (msg.isSystem) {
                        return (
                            <div
                                key={index}
                                className={`text-sm font-['Kalam',cursive] font-bold text-emerald-700 bg-emerald-100 ${bubbleWobble} px-2 py-1`}
                            >
                                {msg.text}
                            </div>
                        );
                    }
                    if (msg.isCorrect) {
                        return (
                            <div
                                key={index}
                                className={`text-sm font-['Kalam',cursive] italic text-emerald-700 bg-emerald-50 ${bubbleWobble} px-2 py-1`}
                            >
                                You guessed it: {msg.text} (hidden from others)
                            </div>
                        );
                    }
                    return (
                        <div key={index} className="text-sm font-['Kalam',cursive] px-1 break-words">
                            <span className="font-bold text-blue-600">{msg.username}: </span>
                            <span className="text-black">{msg.text}</span>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            <div className="shrink-0 flex gap-2">
                <input
                    type="text"
                    placeholder="Type your guess..."
                    className={`flex-1 min-w-0 px-3 py-2 ${inputWobble} border-2 border-black bg-white font-['Kalam',cursive]
                                text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300`}
                    value={inputText}
                    maxLength={200}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleInputSend()}
                />
                <button
                    onClick={handleInputSend}
                    className={`shrink-0 px-4 py-2 ${inputWobble} border-2 border-black bg-emerald-400 hover:bg-emerald-300
                                text-black font-['Fredoka',sans-serif] font-bold shadow-[2px_2px_0px_0px_#000]
                                hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all`}
                >
                    Send
                </button>
            </div>
        </div>
    );
}
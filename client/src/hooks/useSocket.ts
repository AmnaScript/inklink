import {io, Socket} from 'socket.io-client';

let socket : Socket | null = null

export function useSocket() {
    if (!socket) {
        socket = io(import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:5000');
    }
    return socket;
}
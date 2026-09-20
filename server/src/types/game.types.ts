export interface Player {
    socketId: string;
    username: string;
    score: number;
    isDrawer: boolean;
    connected: boolean;
}

export interface DrawAction {
    tool: 'pen' | 'eraser';
    color: string;
    lineWidth: number;
    points: { x: number; y: number }[];
    isStart: boolean;
}

export interface Room {
    roomId: string;
    hostId: string;
    players: Player[];
    currentWord: string;
    wordChoices: string[];
    drawerSocketId: string | null;
    round: number;
    maxRounds: number;          // rounds per player
    timeLeft: number;
    status: 'waiting' | 'selecting' | 'playing' | 'ended' | 'finished';
    guessedPlayers: string[];   // socketIds, NOT usernames
    strokes: DrawAction[];
}

export type PublicRoom = Omit<Room, 'currentWord' | 'wordChoices' | 'strokes'>;
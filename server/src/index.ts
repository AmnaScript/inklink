import express from 'express';
import http from 'node:http';
import { config } from 'dotenv';
import cors from 'cors';
import { Server } from 'socket.io';
import { nanoid } from 'nanoid';
import type { Room, Player, DrawAction, PublicRoom } from './types/game.types.js';
import words from './utils/words.js';

config();

const app = express();
const CLIENT_URL = process.env.CLIENT_URL || '*';
app.use(cors({ origin: CLIENT_URL }));

const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: CLIENT_URL } });

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

const activeRooms = new Map<string, Room>();
const roomTimers = new Map<string, NodeJS.Timeout>();          // 1s round tick
const selectionTimers = new Map<string, NodeJS.Timeout>();     // 15s word pick
const intermissionTimers = new Map<string, NodeJS.Timeout>();  // 5s between rounds

const ROUND_SECONDS = 60;
const SELECTION_SECONDS = 15;
const INTERMISSION_MS = 5000;
const DRAWER_BONUS = 25;
const MAX_STROKES = 8000;
const MAX_MESSAGE_LENGTH = 200;



function clearRoomTimers(roomId: string) {
    const tick = roomTimers.get(roomId);
    if (tick) {
        clearInterval(tick);
        roomTimers.delete(roomId);
    }
    const selection = selectionTimers.get(roomId);
    if (selection) {
        clearTimeout(selection);
        selectionTimers.delete(roomId);
    }
    const intermission = intermissionTimers.get(roomId);
    if (intermission) {
        clearTimeout(intermission);
        intermissionTimers.delete(roomId);
    }
}

/** Strip every secret before a room object leaves the server. */
function publicRoom(room: Room): PublicRoom {
    const { currentWord, wordChoices, strokes, ...safe } = room;
    return safe;
}

function maskWord(word: string) {
    return word
        .split('')
        .map((char) => (char === ' ' ? ' ' : '_'))
        .join('');
}

function pickWords(count: number) {
    return [...words].sort(() => 0.5 - Math.random()).slice(0, count);
}

function sanitise(value: unknown, maxLength: number) {
    return String(value ?? '').trim().slice(0, maxLength);
}

function getDrawer(room: Room) {
    return room.players.find((p) => p.socketId === room.drawerSocketId) ?? null;
}

/* ------------------------------------------------------------------ */
/* Round lifecycle: waiting -> selecting -> playing -> ended -> ...    */
/* ------------------------------------------------------------------ */

function startWordSelection(roomId: string) {
    const room = activeRooms.get(roomId);
    if (!room) return;

    // Guard: a double-click on "Start" or an overlapping auto-advance must not
    // spawn a second round.
    if (room.status === 'selecting' || room.status === 'playing') return;

    clearRoomTimers(roomId);

    if (room.players.length < 2) {
        room.status = 'waiting';
        io.to(roomId).emit('room_updated', publicRoom(room));
        return;
    }

    // Whole game over?
    if (room.round >= room.maxRounds * room.players.length) {
        finishGame(roomId);
        return;
    }

    // The round counter is incremented HERE and nowhere else.
    room.round += 1;

    const drawerIndex = (room.round - 1) % room.players.length;
    const drawer = room.players[drawerIndex];
    if (!drawer) return;

    room.players.forEach((p) => {
        p.isDrawer = p.socketId === drawer.socketId;
    });
    room.drawerSocketId = drawer.socketId;
    room.status = 'selecting';
    room.currentWord = '';
    room.guessedPlayers = [];
    room.strokes = [];
    room.wordChoices = pickWords(3);

    io.to(drawer.socketId).emit('choose_word', {
        randomWords: room.wordChoices,
        seconds: SELECTION_SECONDS,
    });
    io.to(roomId).emit('selection_started', {
        drawerName: drawer.username,
        drawerSocketId: drawer.socketId,
        seconds: SELECTION_SECONDS,
    });
    io.to(roomId).emit('clear_canvas');
    io.to(roomId).emit('room_updated', publicRoom(room));

    selectionTimers.set(
        roomId,
        setTimeout(() => {
            const auto = room.wordChoices[Math.floor(Math.random() * room.wordChoices.length)];
            if (auto) startRound(roomId, auto);
        }, SELECTION_SECONDS * 1000),
    );
}

function startRound(roomId: string, word: string) {
    const room = activeRooms.get(roomId);
    // Only a room that is *currently* selecting may start. This is what stops
    // the manual pick and the 15s fallback from both firing.
    if (!room || room.status !== 'selecting') return;

    clearRoomTimers(roomId);

    const drawer = getDrawer(room);
    if (!drawer) return;

    room.currentWord = word;
    room.status = 'playing';
    room.timeLeft = ROUND_SECONDS;

    io.to(drawer.socketId).emit('your_turn', { word, timeLeft: room.timeLeft });
    io.to(roomId).emit('round_started', {
        round: room.round,
        totalRounds: room.maxRounds * room.players.length,
        timeLeft: room.timeLeft,
        drawerName: drawer.username,
        drawerSocketId: drawer.socketId,
        maskedWord: maskWord(word),
    });
    io.to(roomId).emit('room_updated', publicRoom(room));

    roomTimers.set(
        roomId,
        setInterval(() => {
            const current = activeRooms.get(roomId);
            if (!current || current.status !== 'playing') {
                clearRoomTimers(roomId);
                return;
            }
            current.timeLeft -= 1;
            io.to(roomId).emit('time_updated', { timeLeft: current.timeLeft });
            if (current.timeLeft <= 0) endRound(roomId, 'timeout');
        }, 1000),
    );
}

function endRound(roomId: string, reason: 'timeout' | 'all_guessed' | 'drawer_left') {
    const room = activeRooms.get(roomId);
    if (!room || room.status !== 'playing') return;

    clearRoomTimers(roomId);
    room.status = 'ended';

    io.to(roomId).emit('round_ended', {
        word: room.currentWord,
        reason,
        players: room.players,
    });
    io.to(roomId).emit('room_updated', publicRoom(room));

    intermissionTimers.set(
        roomId,
        setTimeout(() => startWordSelection(roomId), INTERMISSION_MS),
    );
}

function finishGame(roomId: string) {
    const room = activeRooms.get(roomId);
    if (!room) return;

    clearRoomTimers(roomId);
    room.status = 'finished';
    room.drawerSocketId = null;
    room.players.forEach((p) => {
        p.isDrawer = false;
    });

    const ranking = [...room.players].sort((a, b) => b.score - a.score);
    io.to(roomId).emit('game_ended', { players: ranking });
    io.to(roomId).emit('room_updated', publicRoom(room));
}

/* ------------------------------------------------------------------ */
/* Socket handlers                                                     */
/* ------------------------------------------------------------------ */

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('create_room', (data) => {
        const roomId = nanoid(6);
        const username = sanitise(data?.username, 20) || 'Anonymous';

        const host: Player = {
            socketId: socket.id,
            username,
            score: 0,
            isDrawer: false,
            connected: true,
        };

        const room: Room = {
            roomId,
            hostId: socket.id,
            players: [host],
            currentWord: '',
            wordChoices: [],
            drawerSocketId: null,
            round: 0,
            maxRounds: 3,
            timeLeft: 0,
            status: 'waiting',
            guessedPlayers: [],
            strokes: [],
        };

        activeRooms.set(roomId, room);
        socket.join(roomId);

        socket.emit('room_created', { roomId });
        socket.emit('room_joined', { roomId, you: host });
        io.to(roomId).emit('room_updated', publicRoom(room));
    });

    socket.on('join_room', (data) => {
        const roomId = sanitise(data?.roomId, 32);
        const username = sanitise(data?.username, 20) || 'Anonymous';
        const room = activeRooms.get(roomId);

        if (!room) {
            socket.emit('room_error', { message: 'Room not found' });
            return;
        }

        // Reconnect: same username, new socket id. Keeps their score.
        const existing = room.players.find((p) => p.username === username);
        if (existing) {
            const wasDrawer = room.drawerSocketId === existing.socketId;
            // Migrate anything keyed on the old socket id.
            const guessIndex = room.guessedPlayers.indexOf(existing.socketId);
            if (guessIndex !== -1) room.guessedPlayers[guessIndex] = socket.id;
            if (room.hostId === existing.socketId) room.hostId = socket.id;
            if (wasDrawer) room.drawerSocketId = socket.id;
            existing.socketId = socket.id;
            existing.connected = true;
        } else {
            room.players.push({
                socketId: socket.id,
                username,
                score: 0,
                isDrawer: false,
                connected: true,
            });
        }

        socket.join(roomId);

        const you = room.players.find((p) => p.socketId === socket.id)!;
        socket.emit('room_joined', { roomId, you });

        // Bring a late joiner up to speed: current canvas + current word state.
        socket.emit('canvas_state', { strokes: room.strokes });
        if (room.status === 'playing') {
            if (socket.id === room.drawerSocketId) {
                socket.emit('your_turn', { word: room.currentWord, timeLeft: room.timeLeft });
            } else {
                socket.emit('round_started', {
                    round: room.round,
                    totalRounds: room.maxRounds * room.players.length,
                    timeLeft: room.timeLeft,
                    drawerName: getDrawer(room)?.username ?? '',
                    drawerSocketId: room.drawerSocketId,
                    maskedWord: maskWord(room.currentWord),
                });
            }
        }

        io.to(roomId).emit('room_updated', publicRoom(room));
    });

    socket.on('start_round', (data) => {
        const room = activeRooms.get(sanitise(data?.roomId, 32));
        if (!room) return;
        if (room.hostId !== socket.id) {
            socket.emit('room_error', { message: 'Only the host can start the game' });
            return;
        }
        if (room.status !== 'waiting' && room.status !== 'ended' && room.status !== 'finished') return;

        if (room.status === 'finished') {
            // Play again: reset scores and the round counter.
            room.round = 0;
            room.players.forEach((p) => {
                p.score = 0;
            });
            room.status = 'waiting';
        }

        startWordSelection(room.roomId);
    });

    socket.on('word_chosen', (data) => {
        const room = activeRooms.get(sanitise(data?.roomId, 32));
        if (!room || room.status !== 'selecting') return;
        // Real check: compare against the drawer's socket id, not a stale flag.
        if (socket.id !== room.drawerSocketId) return;
        const chosen = sanitise(data?.chosenWord, 40);
        if (!room.wordChoices.includes(chosen)) return;

        startRound(room.roomId, chosen);
    });

    socket.on('draw_stroke', (data) => {
        const room = activeRooms.get(sanitise(data?.roomId, 32));
        if (!room || room.status !== 'playing') return;
        if (socket.id !== room.drawerSocketId) return;
        if (!Array.isArray(data?.points) || data.points.length === 0) return;

        const stroke: DrawAction = {
            tool: data.tool === 'eraser' ? 'eraser' : 'pen',
            color: sanitise(data.color, 20) || '#000000',
            lineWidth: Math.min(Math.max(Number(data.lineWidth) || 5, 1), 60),
            points: data.points
                .slice(0, 10)
                .map((p: { x: number; y: number }) => ({
                    x: Math.min(Math.max(Number(p.x) || 0, 0), 1),
                    y: Math.min(Math.max(Number(p.y) || 0, 0), 1),
                })),
            isStart: Boolean(data.isStart),
        };

        // Replay buffer so late joiners see the drawing in progress.
        if (room.strokes.length < MAX_STROKES) room.strokes.push(stroke);

        socket.to(room.roomId).emit('draw_stroke', stroke);
    });

    socket.on('clear_canvas', (data) => {
        const room = activeRooms.get(sanitise(data?.roomId, 32));
        if (!room || socket.id !== room.drawerSocketId) return;
        room.strokes = [];
        io.to(room.roomId).emit('clear_canvas');
    });

    /**
     * One event for chat AND guessing.
     *  - wrong guess / normal chat  -> broadcast to the whole room
     *  - exact correct guess        -> echoed back to the guesser only,
     *                                  plus a system message for everyone
     */
    socket.on('chat_message', (data) => {
        const room = activeRooms.get(sanitise(data?.roomId, 32));
        if (!room) return;

        const player = room.players.find((p) => p.socketId === socket.id);
        if (!player) return;

        const text = sanitise(data?.message, MAX_MESSAGE_LENGTH);
        if (!text) return;

        const isPlaying = room.status === 'playing';
        const isDrawer = socket.id === room.drawerSocketId;
        const alreadyGuessed = room.guessedPlayers.includes(socket.id);
        const normalised = text.toLowerCase();
        const answer = room.currentWord.toLowerCase();

        if (isPlaying && !isDrawer && !alreadyGuessed && normalised === answer) {
            const pointsEarned = 50 + room.timeLeft;
            player.score += pointsEarned;
            room.guessedPlayers.push(socket.id);

            const drawer = getDrawer(room);
            if (drawer) drawer.score += DRAWER_BONUS;

            // Only the guesser sees what they typed.
            socket.emit('chat_message', {
                username: player.username,
                message: text,
                isCorrect: true,
            });

            io.to(room.roomId).emit('chat_message', {
                username: 'System',
                message: `${player.username} guessed the word! +${pointsEarned}`,
                isSystem: true,
            });
            io.to(room.roomId).emit('room_updated', publicRoom(room));

            const guessers = room.players.filter((p) => p.socketId !== room.drawerSocketId);
            const everyoneGuessed =
                guessers.length > 0 &&
                guessers.every((p) => room.guessedPlayers.includes(p.socketId));
            if (everyoneGuessed) endRound(room.roomId, 'all_guessed');
            return;
        }

        // The drawer (or someone who has already scored) must not leak the word.
        if (isPlaying && (isDrawer || alreadyGuessed) && normalised.includes(answer)) {
            socket.emit('chat_message', {
                username: 'System',
                message: "You can't say the word!",
                isSystem: true,
            });
            return;
        }

        // Everything else — including every wrong guess — goes to the room.
        io.to(room.roomId).emit('chat_message', {
            username: player.username,
            message: text,
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);

        activeRooms.forEach((room, roomId) => {
            const index = room.players.findIndex((p) => p.socketId === socket.id);
            if (index === -1) return;

            const wasDrawer = socket.id === room.drawerSocketId;
            room.players.splice(index, 1);

            if (room.players.length === 0) {
                clearRoomTimers(roomId);   // don't leak intervals on dead rooms
                activeRooms.delete(roomId);
                console.log(`Deleted empty room ${roomId}`);
                return;
            }

            if (room.hostId === socket.id) room.hostId = room.players[0]!.socketId;

            if (wasDrawer && room.status === 'playing') {
                endRound(roomId, 'drawer_left');
            } else if (wasDrawer && room.status === 'selecting') {
                clearRoomTimers(roomId);
                room.status = 'ended';
                intermissionTimers.set(
                    roomId,
                    setTimeout(() => startWordSelection(roomId), 1500),
                );
            } else if (room.status === 'playing') {
                // The leaver may have been the last player we were waiting on.
                const guessers = room.players.filter((p) => p.socketId !== room.drawerSocketId);
                const everyoneGuessed =
                    guessers.length > 0 &&
                    guessers.every((p) => room.guessedPlayers.includes(p.socketId));
                if (everyoneGuessed) endRound(roomId, 'all_guessed');
            }

            io.to(roomId).emit('room_updated', publicRoom(room));
        });
    });
});

app.get('/', (_req, res) => {
    res.send('InkLink server is running');
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
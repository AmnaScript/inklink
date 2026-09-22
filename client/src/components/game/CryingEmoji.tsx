const crying_emojis = ['😭', '😭', '😭', '😭'];

export function CryingEmoji() {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {Array.from({ length: 14 }).map((_, i) => (
                <span
                    key={i}
                    className="absolute top-0 text-xl animate-confetti-fall"
                    style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 0.4}s` }}
                    aria-hidden
                >
                    {crying_emojis[i % crying_emojis.length]}
                </span>
            ))}
        </div>
    );
}
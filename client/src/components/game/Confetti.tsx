const DEFAULT_EMOJIS = ['🎉', '✨', '🎊', '⭐'];

export function Confetti({ emojis = DEFAULT_EMOJIS }: { emojis?: string[] }) {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {Array.from({ length: 14 }).map((_, i) => (
                <span
                    key={i}
                    className="absolute top-0 text-xl animate-confetti-fall"
                    style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 0.4}s` }}
                    aria-hidden
                >
                    {emojis[i % emojis.length]}
                </span>
            ))}
        </div>
    );
}
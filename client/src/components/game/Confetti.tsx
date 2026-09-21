const CONFETTI = ['🎉', '✨', '🎊', '⭐'];

export function Confetti() {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {Array.from({ length: 14 }).map((_, i) => (
                <span
                    key={i}
                    className="absolute top-0 text-xl animate-confetti-fall"
                    style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 0.4}s` }}
                    aria-hidden
                >
                    {CONFETTI[i % CONFETTI.length]}
                </span>
            ))}
        </div>
    );
}
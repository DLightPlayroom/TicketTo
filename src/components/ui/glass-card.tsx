import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
}

export function GlassCard({ children, className, ...props }: GlassCardProps) {
    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-xl border border-white/20 bg-white/10 backdrop-blur-md shadow-lg transition-all hover:shadow-xl",
                className
            )}
            {...props}
        >
            {/* Decorative gradient blob for extra depth */}
            <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-white/5 blur-3xl"></div>

            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
}


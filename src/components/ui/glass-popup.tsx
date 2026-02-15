import { GlassCard } from "./glass-card";
import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";

interface GlassPopupProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    className?: string; // For the popup content container
    overlayClassName?: string;
    closeOnOutsideClick?: boolean;
}

export function GlassPopup({
    isOpen,
    onClose,
    title,
    children,
    className,
    overlayClassName,
    closeOnOutsideClick = true
}: GlassPopupProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        let rafId: number;
        let timerId: NodeJS.Timeout;

        if (isOpen) {
            setIsVisible(true);
            // Small delay to ensure render happens before animation starts
            rafId = requestAnimationFrame(() => setIsAnimating(true));
        } else {
            setIsAnimating(false);
            timerId = setTimeout(() => setIsVisible(false), 300); // Match transition duration
        }

        return () => {
            if (rafId) cancelAnimationFrame(rafId);
            if (timerId) clearTimeout(timerId);
        };
    }, [isOpen]);

    if (!isVisible) return null;

    return (
        <div
            className={cn(
                "fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300",
                isAnimating ? "opacity-100 backdrop-blur-sm" : "opacity-0 backdrop-blur-none",
                "bg-black/40", // Base overlay color
                overlayClassName
            )}
            onClick={closeOnOutsideClick ? onClose : undefined}
        >
            <div
                className={cn(
                    "relative w-full max-w-lg transition-all duration-300 transform",
                    isAnimating ? "scale-100 translate-y-0 opacity-100" : "scale-95 translate-y-4 opacity-0"
                )}
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
            >
                <GlassCard className={cn("relative flex flex-col gap-4 p-6 overflow-hidden", className)}>
                    {/* Decorative gradient blobs */}
                    <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl"></div>
                    <div className="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl"></div>

                    <div className="relative z-10 flex flex-col gap-4">
                        <div className="flex items-start justify-between">
                            {title && <h2 className="text-xl font-semibold text-foreground pr-8">{title}</h2>}
                        </div>
                        <div className="mt-1">
                            {children}
                        </div>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}

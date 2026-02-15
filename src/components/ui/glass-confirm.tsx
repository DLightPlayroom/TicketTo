import { AlertTriangle, HelpCircle } from "lucide-react";
import { GlassPopup } from "./glass-popup";
import { cn } from "@/lib/utils";
import React from "react";

interface GlassConfirmProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "danger" | "warning" | "info";
    isLoading?: boolean;
}

const variants = {
    danger: {
        icon: AlertTriangle,
        color: "text-rose-500 dark:text-rose-400",
        bg: "bg-rose-500/10 dark:bg-rose-500/20 ring-1 ring-rose-500/20",
        confirmBtn: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20",
    },
    warning: {
        icon: AlertTriangle,
        color: "text-amber-500 dark:text-amber-400",
        bg: "bg-amber-500/10 dark:bg-amber-500/20 ring-1 ring-amber-500/20",
        confirmBtn: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20",
    },
    info: {
        icon: HelpCircle,
        color: "text-blue-500 dark:text-blue-400",
        bg: "bg-blue-500/10 dark:bg-blue-500/20 ring-1 ring-blue-500/20",
        confirmBtn: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20",
    }
};

export function GlassConfirm({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    variant = "info",
    isLoading = false
}: GlassConfirmProps) {
    const style = variants[variant];
    const Icon = style.icon;

    return (
        <GlassPopup isOpen={isOpen} onClose={onClose} className="max-w-md text-center pt-8 pb-8" closeOnOutsideClick={!isLoading}>
            <div className="flex flex-col items-center gap-5">
                <div className={cn("p-4 rounded-full shadow-lg shadow-black/5", style.bg)}>
                    <Icon className={cn("h-10 w-10", style.color)} />
                </div>
                <div className="space-y-3 px-2">
                    <h3 className="text-xl font-bold tracking-tight">{title}</h3>
                    <div className="text-sm text-muted-foreground leading-relaxed">
                        {message}
                    </div>
                </div>
                <div className="mt-4 flex flex-col sm:flex-row gap-3 w-full justify-center px-4">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className={cn(
                            "px-6 py-2.5 rounded-full font-medium transition-all duration-200 bg-white/5 hover:bg-white/10 active:scale-95 disabled:opacity-50",
                            "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                        }}
                        disabled={isLoading}
                        className={cn(
                            "px-8 py-2.5 rounded-full font-medium transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50",
                            style.confirmBtn
                        )}
                    >
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <span className="h-4 w-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                                Processing...
                            </span>
                        ) : confirmLabel}
                    </button>
                </div>
            </div>
        </GlassPopup>
    );
}

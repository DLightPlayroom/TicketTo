import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react";
import { GlassPopup } from "./glass-popup";
import { cn } from "@/lib/utils";
import React from "react";

export type AlertType = "success" | "error" | "warning" | "info";

export interface GlassAlertProps {
    isOpen: boolean;
    onClose: () => void;
    type?: AlertType;
    title: string;
    message: React.ReactNode;
    actionLabel?: string;
    onAction?: () => void;
}

const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
};

const colors = {
    success: "text-emerald-500 dark:text-emerald-400",
    error: "text-rose-500 dark:text-rose-400",
    warning: "text-amber-500 dark:text-amber-400",
    info: "text-blue-500 dark:text-blue-400",
};

const bgColors = {
    success: "bg-emerald-500/10 dark:bg-emerald-500/20 ring-1 ring-emerald-500/20",
    error: "bg-rose-500/10 dark:bg-rose-500/20 ring-1 ring-rose-500/20",
    warning: "bg-amber-500/10 dark:bg-amber-500/20 ring-1 ring-amber-500/20",
    info: "bg-blue-500/10 dark:bg-blue-500/20 ring-1 ring-blue-500/20",
};

export function GlassAlert({
    isOpen,
    onClose,
    type = "info",
    title,
    message,
    actionLabel = "OK",
    onAction
}: GlassAlertProps) {
    const Icon = icons[type];
    const colorClass = colors[type];
    const bgClass = bgColors[type];

    const handleAction = () => {
        if (onAction) onAction();
        onClose();
    };

    return (
        <GlassPopup isOpen={isOpen} onClose={onClose} className="max-w-md text-center pt-8 pb-8">
            <div className="flex flex-col items-center gap-5">
                <div className={cn("p-4 rounded-full shadow-lg shadow-black/5", bgClass)}>
                    <Icon className={cn("h-10 w-10", colorClass)} />
                </div>
                <div className="space-y-3 px-2">
                    <h3 className="text-xl font-bold tracking-tight">{title}</h3>
                    <div className="text-sm text-muted-foreground leading-relaxed">
                        {message}
                    </div>
                </div>
                <button
                    onClick={handleAction}
                    className={cn(
                        "mt-4 px-8 py-2.5 rounded-full font-medium transition-all duration-200 shadow-md hover:shadow-lg active:scale-95",
                        "bg-foreground text-background hover:bg-foreground/90"
                    )}
                >
                    {actionLabel}
                </button>
            </div>
        </GlassPopup>
    );
}

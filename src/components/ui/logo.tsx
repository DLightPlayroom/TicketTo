import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
    className?: string; // Additional classes for the wrapper or image
    width?: number;
    height?: number;
    onClick?: () => void;
}

export function Logo({ className, width = 32, height = 32, onClick }: LogoProps) {
    return (
        <div className={cn("relative inline-flex items-center justify-center", className)} onClick={onClick}>
            <Image
                src="/logo.png"
                alt="TicketTo Logo"
                width={width}
                height={height}
                className="object-contain"
                priority
            />
        </div>
    );
}

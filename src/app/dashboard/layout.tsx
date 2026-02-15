import { UserMenu } from "@/components/user-menu";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="relative min-h-screen transition-colors duration-300">
            <div className="absolute top-6 right-6 z-50">
                <UserMenu variant="glass" />
            </div>
            {children}
        </div>
    );
}

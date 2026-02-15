import { UserMenu } from "@/components/user-menu";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="relative min-h-screen bg-gray-50 dark:bg-zinc-900 transition-colors duration-300">
            <div className="absolute top-6 right-6 z-50">
                <UserMenu variant="simple" />
            </div>
            {children}
        </div>
    );
}


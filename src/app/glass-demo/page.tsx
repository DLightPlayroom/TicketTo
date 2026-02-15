"use client";

import { useState } from "react";
import { GlassCard, GlassAlert, GlassConfirm, GlassPopup } from "@/components/ui";

export default function GlassDemoPage() {
    const [successOpen, setSuccessOpen] = useState(false);
    const [errorOpen, setErrorOpen] = useState(false);
    const [warningOpen, setWarningOpen] = useState(false);
    const [infoOpen, setInfoOpen] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [popupOpen, setPopupOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleConfirm = () => {
        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setConfirmOpen(false);
            setSuccessOpen(true);
        }, 2000);
    };

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-8 gap-8 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop')] bg-cover bg-center text-white relative">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-0"></div>

            <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-5xl">
                <h1 className="text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-purple-200 drop-shadow-lg">
                    Glass UI Components
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                    <GlassCard className="p-8 flex flex-col gap-6 items-center hover:scale-105 transition-transform duration-300">
                        <h2 className="text-2xl font-bold w-full text-center">Alert Variants</h2>
                        <div className="grid grid-cols-2 gap-3 w-full">
                            <button onClick={() => setSuccessOpen(true)} className="px-4 py-2 bg-emerald-500/80 hover:bg-emerald-500 rounded-lg font-medium transition shadow-lg shadow-emerald-500/20">Success</button>
                            <button onClick={() => setErrorOpen(true)} className="px-4 py-2 bg-rose-500/80 hover:bg-rose-500 rounded-lg font-medium transition shadow-lg shadow-rose-500/20">Error</button>
                            <button onClick={() => setWarningOpen(true)} className="px-4 py-2 bg-amber-500/80 hover:bg-amber-500 rounded-lg font-medium transition shadow-lg shadow-amber-500/20">Warning</button>
                            <button onClick={() => setInfoOpen(true)} className="px-4 py-2 bg-blue-500/80 hover:bg-blue-500 rounded-lg font-medium transition shadow-lg shadow-blue-500/20">Info</button>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-8 flex flex-col gap-6 items-center hover:scale-105 transition-transform duration-300">
                        <h2 className="text-2xl font-bold w-full text-center">Workflows</h2>
                        <div className="flex flex-col gap-3 w-full">
                            <button onClick={() => setConfirmOpen(true)} className="px-4 py-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl font-bold transition shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2">
                                <span>Delete Important Item</span>
                            </button>
                            <p className="text-xs text-center text-white/60">Triggers async loading state</p>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-8 flex flex-col gap-6 items-center hover:scale-105 transition-transform duration-300">
                        <h2 className="text-2xl font-bold w-full text-center">Custom Content</h2>
                        <button onClick={() => setPopupOpen(true)} className="w-full px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl font-medium transition backdrop-blur-md">
                            Open Custom Modal
                        </button>
                    </GlassCard>
                </div>
            </div>

            {/* Alert Component Instances */}
            <GlassAlert
                isOpen={successOpen}
                onClose={() => setSuccessOpen(false)}
                type="success"
                title="Payment Successful"
                message="Your transaction has been processed successfully. A confirmation email has been sent to your inbox."
            />

            <GlassAlert
                isOpen={errorOpen}
                onClose={() => setErrorOpen(false)}
                type="error"
                title="Connection Failed"
                message="We couldn't connect to the server. Please check your internet connection and try again."
                actionLabel="Retry Connection"
            />

            <GlassAlert
                isOpen={warningOpen}
                onClose={() => setWarningOpen(false)}
                type="warning"
                title="Low Storage"
                message="You have used 95% of your available storage. Please upgrade your plan to avoid interruption."
                actionLabel="Upgrade Plan"
            />

            <GlassAlert
                isOpen={infoOpen}
                onClose={() => setInfoOpen(false)}
                type="info"
                title="New Features Info"
                message="We have updated our privacy policy. Please review the changes in your account settings."
            />

            {/* Confirmation Component Instance */}
            <GlassConfirm
                isOpen={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={handleConfirm}
                title="Delete Project?"
                message="Are you sure you want to delete 'Marketing Campaign 2024'? This action cannot be undone and all data will be permanently lost."
                variant="danger"
                confirmLabel="Yes, Delete It"
                isLoading={loading}
            />

            {/* Custom Popup Instance */}
            <GlassPopup
                isOpen={popupOpen}
                onClose={() => setPopupOpen(false)}
                title="Custom Configuration"
            >
                <div className="space-y-4">
                    <p className="text-muted-foreground">Configure your display settings below:</p>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="h-24 bg-white/5 rounded-lg border border-white/10 flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition cursor-pointer">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">A</div>
                            <span className="text-sm font-medium">Layout A</span>
                        </div>
                        <div className="h-24 bg-white/5 rounded-lg border border-white/10 flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition cursor-pointer">
                            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">B</div>
                            <span className="text-sm font-medium">Layout B</span>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-white/10 flex justify-end gap-2">
                        <button onClick={() => setPopupOpen(false)} className="px-4 py-2 hover:bg-white/5 rounded-lg text-sm transition text-muted-foreground hover:text-foreground">Cancel</button>
                        <button onClick={() => setPopupOpen(false)} className="px-4 py-2 bg-foreground text-background rounded-lg text-sm font-medium hover:opacity-90 transition">Save Changes</button>
                    </div>
                </div>
            </GlassPopup>

        </div>
    );
}

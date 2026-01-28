'use client';

import { useRouter } from 'next/navigation';
import { LayoutDashboard } from 'lucide-react';

export default function DevStudioAccess() {
    const router = useRouter();

    const handleEnter = () => {
        // Set demo cookie for bypass
        document.cookie = "nali_demo_mode=true; path=/; max-age=86400"; // 1 day
        router.push('/studio/library');
    };

    return (
        <button
            onClick={handleEnter}
            className="hidden md:flex items-center gap-2 px-4 py-2 text-[#4e3629]/60 hover:text-[#4e3629] text-sm font-medium transition-colors"
            title="Dev Access to Studio"
        >
            <LayoutDashboard className="w-4 h-4" />
            <span>Studio</span>
        </button>
    );
}

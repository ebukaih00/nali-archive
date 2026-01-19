'use client';

import Link from 'next/link';
import SearchNames from '../../components/SearchNames';
import { ArrowLeft } from 'lucide-react';
import { Suspense } from 'react';

export default function ExplorePage() {
    return (
        <main className="min-h-screen bg-background pt-12">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-12">
                    <Link
                        href="/"
                        className="text-primary hover:text-primary/80 font-medium flex items-center gap-2 transition-colors font-sans"
                    >
                        <ArrowLeft className="w-5 h-5" /> Back to Home
                    </Link>
                    <h1 className="text-5xl font-serif text-foreground tracking-tight">
                        Explore All Names
                    </h1>
                    <div className="w-24"></div>
                </div>

                <Suspense fallback={<div>Loading...</div>}>
                    <SearchNames />
                </Suspense>
            </div>
        </main>
    );
}

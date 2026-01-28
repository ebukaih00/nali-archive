'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface NamesMarqueeProps {
    names: string[];
    count: number;
}

export default function NamesMarquee({ names, count }: NamesMarqueeProps) {
    // Duplicate the list to create a seamless loop
    const marqueeList = [...names, ...names, ...names];

    return (
        <div className="w-full mt-16 pointer-events-none fade-in-up delay-300">
            <div className="flex items-center justify-center gap-6 mb-8 w-full max-w-4xl mx-auto px-6">
                <div className="h-[1px] bg-[#E9E4DE] flex-1" />
                <p className="text-center text-sm text-secondary/70 font-medium whitespace-nowrap">
                    Mastering {count.toLocaleString()} names and counting...
                </p>
                <div className="h-[1px] bg-[#E9E4DE] flex-1" />
            </div>

            <div className="relative w-full overflow-hidden mask-linear-fade">
                {/* Gradient Masks */}
                <div className="absolute left-0 top-0 bottom-0 w-12 md:w-24 bg-gradient-to-r from-[#F8F7F5] to-transparent z-10" />
                <div className="absolute right-0 top-0 bottom-0 w-12 md:w-24 bg-gradient-to-l from-[#F8F7F5] to-transparent z-10" />

                <div className="flex w-max animate-marquee">
                    {marqueeList.map((name, index) => (
                        <div
                            key={`${name}-${index}`}
                            className="flex-shrink-0 px-8 mx-2 text-xl font-serif font-medium md:text-2xl text-[#2C2420]/40 whitespace-nowrap"
                        >
                            {name}
                        </div>
                    ))}
                </div>
            </div>

            <style jsx>{`
                .mask-linear-fade {
                    mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
                    -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
                }
                .animate-marquee {
                    animation: marquee 30s linear infinite;
                }
                @media (min-width: 768px) {
                    .animate-marquee {
                        animation: marquee 60s linear infinite;
                    }
                }
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-33.33%); }
                }
            `}</style>
        </div>
    );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, useInView } from 'framer-motion';
import { Play, Pause, ArrowRight, Mic, HandHeart, Speech } from 'lucide-react';

// Scroll Reveal Component
const Reveal = ({ children, width = "fit-content" }: { children: React.ReactNode, width?: "fit-content" | "100%" }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-75px" });

    return (
        <div ref={ref} style={{ width, position: "relative", overflow: "hidden" }}>
            <motion.div
                variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 }
                }}
                initial="hidden"
                animate={isInView ? "visible" : "hidden"}
                transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            >
                {children}
            </motion.div>
        </div>
    );
};

// Creator Name Card Component
const CreatorNameCard = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const togglePlay = () => {
        // Mock audio interaction
        setIsPlaying(true);
        setTimeout(() => setIsPlaying(false), 2000);
    };

    return (
        <div className="bg-white rounded-2xl p-8 border border-[#E9E4DE] shadow-[0_2px_8px_rgba(0,0,0,0.04)] w-full max-w-lg">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#F3EFEC] text-[#5D4037] uppercase tracking-wider mb-6">
                Igbo
            </span>

            <h3 className="text-3xl md:text-4xl font-serif text-[#2C2420] mb-3">
                Chukwuebuka Ihueze
            </h3>

            <div className="inline-block px-4 py-2 bg-[#F8F6F4] rounded-lg text-[#4e3629] font-medium text-lg mb-8">
                choo-kweh-BOO-kah ee-HWAY-zeh
            </div>

            <button
                onClick={togglePlay}
                className="w-full bg-[#F3EFEC] hover:bg-[#EBE5E0] rounded-xl p-4 flex items-center gap-4 transition-colors group text-left"
            >
                <div className="w-12 h-12 rounded-full bg-[#4e3629] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    {isPlaying ? (
                        <div className="flex gap-1">
                            <span className="w-1 h-4 bg-white animate-[bounce_1s_infinite]"></span>
                            <span className="w-1 h-6 bg-white animate-[bounce_1s_infinite_0.2s]"></span>
                            <span className="w-1 h-4 bg-white animate-[bounce_1s_infinite_0.4s]"></span>
                        </div>
                    ) : (
                        <Play className="w-5 h-5 text-white fill-white ml-1" />
                    )}
                </div>
                <div>
                    <span className="block text-[#4e3629] font-bold">Hear my name</span>
                    <span className="text-sm text-[#8D6E63]">Native pronunciation</span>
                </div>
            </button>
        </div>
    );
};

export default function AboutPage() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('nali_token');
        if (token) setIsLoggedIn(true);
    }, []);

    return (
        <main className="min-h-screen bg-[#F8F7F5] selection:bg-[#4e3629] selection:text-white pb-20">
            {/* Header */}
            <header className="w-full flex justify-between items-center py-6 px-6 md:px-12 max-w-7xl mx-auto mb-16 md:mb-24">
                <Link href="/" className="text-3xl font-serif font-bold text-[#4e3629]">
                    Nali
                </Link>
                <div className="flex items-center gap-6">
                    {isLoggedIn ? (
                        <Link href="/studio/library" className="px-5 py-2.5 rounded-full bg-[#4e3629] text-white text-sm font-medium hover:bg-[#3d2b21] transition-colors flex items-center gap-2">
                            <Mic className="w-4 h-4" /> Back to Studio
                        </Link>
                    ) : (
                        <Link href="/contribute" className="px-5 py-2.5 rounded-full bg-white border border-[#E9E4DE] text-[#4e3629] text-sm font-medium hover:bg-[#F3EFEC] hover:border-[#D7CCC8] transition-colors">
                            Become a contributor
                        </Link>
                    )}
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 md:px-12">
                {/* Intro Section */}
                <section className="mb-32 max-w-full">
                    <Reveal>
                        <h2 className="text-2xl font-serif font-semibold text-[#2C2420] mb-8">About Nali</h2>
                    </Reveal>

                    <Reveal>
                        <div className="prose prose-lg text-[#4e3629] leading-relaxed space-y-8">
                            <p className="text-xl md:text-2xl font-light">
                                Names carry more than just a sound; they hold stories, lineage, and a sense of home. For many in the Nigerian diaspora, our names are the first thing people meet, yet they are often mispronounced, which strips away their meaning and the history they carry.
                            </p>
                            <p className="text-xl md:text-2xl font-light">
                                Nali exists to turn that friction into a moment of connection. Whether you're reconnecting with your roots or simply trying to address a new colleague with respect, this tool is designed to help you say it right. Every entry is more than just data; it’s a guide to understanding the heritage behind the syllables.
                            </p>
                        </div>
                    </Reveal>
                </section>

                {/* Who Made This Section */}
                <section className="mb-32">
                    <div className="max-w-full">
                        <Reveal>
                            <h2 className="text-2xl font-serif font-semibold text-[#2C2420] mb-8">Who Made This</h2>
                        </Reveal>

                        <Reveal>
                            <div className="space-y-8">
                                <p className="text-xl md:text-2xl font-light text-[#4e3629] leading-relaxed">
                                    I’m Chukwuebuka Ihueze, a Product Designer based in the UK. I’m fascinated by how design can solve the small, everyday problems that actually matter—like preserving culture in a digital world. This project is my way of using technology to foster the kind of understanding that starts with a name.
                                </p>
                                <p className="text-xl md:text-2xl font-light text-[#4e3629] leading-relaxed">
                                    <Link href="/?search=Chukwuebuka" target="_blank" className="underline decoration-[#4e3629]/30 hover:decoration-[#4e3629] transition-all underline-offset-4">
                                        Learn how to pronounce my name here
                                    </Link>
                                </p>


                            </div>
                        </Reveal>
                    </div>
                </section>

                {/* Footer CTA */}
                <section className="py-20 border-t border-[#E9E4DE]">
                    <Reveal width="100%">
                        <div className="max-w-4xl mx-auto text-center">
                            <div className="w-14 h-14 bg-[#EDE9E4] rounded-full flex items-center justify-center mx-auto mb-6 text-[#4e3629]">
                                <HandHeart className="w-7 h-7" />
                            </div>
                            <h2 className="text-3xl md:text-4xl font-serif text-[#2C2420] font-medium mb-6">Become a voice for your culture</h2>
                            <p className="text-[#4e3629] text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
                                Nali is built by the community, for the community. If you're a native speaker, your voice can help preserve our heritage for future generations.
                            </p>
                            <Link
                                href={isLoggedIn ? "/studio/library" : "/contribute"}
                                className="inline-flex items-center gap-2 px-8 py-4 bg-[#4e3629] text-white rounded-full font-medium hover:bg-[#3d2b21] transition-colors shadow-lg shadow-[#4e3629]/20"
                            >
                                {isLoggedIn ? "Go to Dashboard" : "Become a Contributor"} <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </Reveal>
                </section>
            </div>
        </main>
    );
}

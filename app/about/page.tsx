import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AboutPage() {
    return (
        <div className="w-full max-w-[680px] mx-auto px-4 pt-16 pb-12">
            <Link
                href="/"
                className="inline-flex items-center gap-2 text-secondary hover:text-primary active:text-primary transition-colors mb-8"
            >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Search</span>
            </Link>

            <div className="space-y-6">
                <h1 className="text-[32px] md:text-[40px] font-serif text-foreground font-medium tracking-tight">
                    About This Project
                </h1>

                <div className="prose prose-lg text-foreground font-light">
                    <p className="text-lg leading-relaxed">
                        Names carry more than just a sound; they hold stories, lineage, and a sense of home. For many in the Nigerian diaspora, our names are the first thing people meet, yet they are often mispronounced, which strips away their meaning and the history they carry.
                    </p>

                    <p className="text-lg leading-relaxed mt-4">
                        I built <span className="font-bold">Nali</span> to turn that friction into a moment of connection. Whether you're reconnecting with
                        your roots or simply trying to address a new colleague with respect, this tool is designed to help you
                        say it right. Every entry is more than just data; it’s a guide to understanding the heritage behind the syllables.
                    </p>

                    <div className="mt-12 pt-8 border-t border-primary/20">
                        <h2 className="text-2xl font-serif text-foreground font-medium mb-4">Who made this</h2>
                        <p className="text-lg leading-relaxed">
                            I’m Chukwuebuka Ihueze, a Product Designer based in the UK. I’m fascinated by how design can solve the small,
                            everyday problems that actually matter—like preserving culture in a digital world. This project is my
                            way of using technology to foster the kind of understanding that starts with a name.
                        </p>
                        <p className="text-lg leading-relaxed mt-4">
                            <Link href="/?search=Chukwuebuka" className="underline decoration-secondary/30 hover:decoration-primary transition-colors">
                                Learn how to pronounce my name here
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

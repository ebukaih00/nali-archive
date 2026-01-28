'use client';

interface NamesCloudProps {
    names: string[];
}

export default function NamesCloud({ names }: NamesCloudProps) {
    return (
        <div className="w-full max-w-3xl mx-auto mt-16 px-6 pointer-events-none select-none fade-in-up delay-300">
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 md:gap-x-8 md:gap-y-4">
                {names.map((name, index) => {
                    // subtle randomization for "museum wall" feel
                    const opacityClass = index % 3 === 0 ? 'opacity-40' : index % 2 === 0 ? 'opacity-60' : 'opacity-80';
                    const weightClass = index % 3 === 0 ? 'font-light' : 'font-normal';

                    return (
                        <span
                            key={`${name}-${index}`}
                            className={`text-[#2C2420] text-lg md:text-xl font-serif ${opacityClass} ${weightClass}`}
                        >
                            {name}
                        </span>
                    );
                })}
            </div>
        </div>
    );
}

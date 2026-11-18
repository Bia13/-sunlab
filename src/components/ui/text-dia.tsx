"use client";

import { useState, useEffect } from "react";
// "framer-motion" é o mesmo pacote que "motion/react" e já é o usado no resto do site.
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface DiaTextProps extends React.HTMLAttributes<HTMLSpanElement> {
    words: string[];
    /** Tempo de cada palavra na tela, em ms. */
    duration?: number;
    /**
     * Repetir sem parar. Padrão false: a troca para na última palavra.
     * WCAG 2.2.2 (Pausar, Parar, Ocultar): movimento automático com mais de 5s precisa de controle
     * para pausar. Parando sozinho antes disso, não precisa.
     */
    loop?: boolean;
    /** Cores da varredura que revela cada palavra. A cor final é sempre currentColor. */
    sweepColors?: string[];
    className?: string;
}

export function DiaText({
    words,
    duration = 2000,
    loop = false,
    sweepColors = ["#2563EB", "#EA580C", "#DB2777", "#9333EA"],
    className,
    ...props
}: DiaTextProps) {
    const reduceMotion = useReducedMotion();
    // Com "reduzir movimento", mostra direto a última palavra, sem troca.
    const [index, setIndex] = useState(reduceMotion ? words.length - 1 : 0);

    useEffect(() => {
        if (reduceMotion) {
            setIndex(words.length - 1);
            return;
        }
        const interval = setInterval(() => {
            setIndex((prev) => {
                if (!loop && prev >= words.length - 1) {
                    clearInterval(interval);
                    return prev;
                }
                return (prev + 1) % words.length;
            });
        }, duration);

        return () => clearInterval(interval);
    }, [words, duration, loop, reduceMotion]);

    const [first, ...rest] = sweepColors;
    const gradient = `linear-gradient(90deg, currentColor 50%, ${first} 50%${rest.length ? ", " + rest.join(", ") : ""})`;

    return (
        <span
            className={cn("relative inline-block overflow-hidden min-w-[2ch] align-bottom", className)}
            style={{ verticalAlign: "bottom" }}
            {...props}
        >
            <AnimatePresence mode="wait" initial={false}>
                <motion.span
                    key={index}
                    initial={{ y: "100%", opacity: 0, filter: "blur(4px)" }}
                    animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
                    exit={{ y: "-100%", opacity: 0, filter: "blur(4px)" }}
                    transition={{
                        y: { type: "spring", stiffness: 300, damping: 30 },
                        opacity: { duration: 0.2 },
                        filter: { duration: 0.2 },
                    }}
                    className="absolute inset-0 inline-block"
                >
                    <motion.span
                        className="inline-block bg-clip-text pb-1"
                        style={{
                            WebkitTextFillColor: "transparent",
                            backgroundImage: gradient,
                            backgroundSize: "250% 100%",
                        }}
                        initial={reduceMotion ? false : { backgroundPosition: "100% 0%" }}
                        animate={{ backgroundPosition: "0% 0%" }}
                        transition={{ duration: 0.8, ease: "easeInOut", delay: 0.1 }}
                    >
                        {words[index]}
                    </motion.span>
                </motion.span>
            </AnimatePresence>

            {/* Spacer for layout stability */}
            <span className="invisible" aria-hidden="true">{words[index]}</span>
        </span>
    );
}

export default DiaText;

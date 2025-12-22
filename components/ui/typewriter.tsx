'use client';

import { useState, useEffect, useRef } from 'react';

interface TypewriterProps {
    text: string;
    speed?: number;
    className?: string;
}

export function Typewriter({ text, speed = 20, className = '' }: TypewriterProps) {
    const [displayText, setDisplayText] = useState('');
    const [showCursor, setShowCursor] = useState(true);
    const prevTextRef = useRef('');

    useEffect(() => {
        // Text changed - animate
        if (text === prevTextRef.current) return;

        const prevText = prevTextRef.current;
        prevTextRef.current = text;

        // If we had text before, do a quick clear then type new
        if (prevText.length > 0 && text !== prevText) {
            // Quick backspace effect
            let deleteIndex = prevText.length;
            const deleteInterval = setInterval(() => {
                deleteIndex--;
                if (deleteIndex <= 0) {
                    clearInterval(deleteInterval);
                    setDisplayText('');
                    // Now type the new text
                    typeText(text);
                } else {
                    setDisplayText(prevText.slice(0, deleteIndex));
                }
            }, 15);
            return () => clearInterval(deleteInterval);
        } else {
            // Just type new text
            typeText(text);
        }

        function typeText(targetText: string) {
            let i = 0;
            setShowCursor(true);
            const typeInterval = setInterval(() => {
                if (i < targetText.length) {
                    setDisplayText(targetText.slice(0, i + 1));
                    i++;
                } else {
                    clearInterval(typeInterval);
                    setTimeout(() => setShowCursor(false), 500);
                }
            }, speed);
        }
    }, [text, speed]);

    // Initial render - show empty with cursor
    useEffect(() => {
        if (text && displayText === '') {
            let i = 0;
            const typeInterval = setInterval(() => {
                if (i < text.length) {
                    setDisplayText(text.slice(0, i + 1));
                    i++;
                } else {
                    clearInterval(typeInterval);
                    setTimeout(() => setShowCursor(false), 500);
                }
            }, speed);
            prevTextRef.current = text;
            return () => clearInterval(typeInterval);
        }
    }, []);

    return (
        <span className={className}>
            {displayText}
            {showCursor && <span className="animate-pulse text-gray-400">|</span>}
        </span>
    );
}

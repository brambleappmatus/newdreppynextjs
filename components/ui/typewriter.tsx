'use client';

import { useState, useEffect, useRef } from 'react';

interface TypewriterProps {
    text: string;
    speed?: number;           // ms per character
    deleteSpeed?: number;     // ms per character when deleting
    className?: string;
    onComplete?: () => void;
}

export function Typewriter({
    text,
    speed = 30,
    deleteSpeed = 20,
    className = '',
    onComplete,
}: TypewriterProps) {
    const [displayText, setDisplayText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const previousTextRef = useRef(text);
    const targetTextRef = useRef(text);
    const isAnimatingRef = useRef(false);

    useEffect(() => {
        // If text hasn't changed, don't animate
        if (text === previousTextRef.current && displayText === text) {
            return;
        }

        // New text received - start animation
        targetTextRef.current = text;

        // If we have existing text, delete it first
        if (displayText.length > 0 && text !== displayText) {
            setIsDeleting(true);
        }

        previousTextRef.current = text;
    }, [text, displayText]);

    useEffect(() => {
        if (isAnimatingRef.current) return;

        let timeout: NodeJS.Timeout;

        if (isDeleting) {
            // Deleting animation (backspace effect)
            if (displayText.length > 0) {
                isAnimatingRef.current = true;
                timeout = setTimeout(() => {
                    setDisplayText(prev => prev.slice(0, -1));
                    isAnimatingRef.current = false;
                }, deleteSpeed);
            } else {
                // Done deleting, start typing
                setIsDeleting(false);
            }
        } else {
            // Typing animation
            const target = targetTextRef.current;
            if (displayText.length < target.length) {
                isAnimatingRef.current = true;
                timeout = setTimeout(() => {
                    setDisplayText(target.slice(0, displayText.length + 1));
                    isAnimatingRef.current = false;
                }, speed);
            } else if (displayText === target && onComplete) {
                onComplete();
            }
        }

        return () => clearTimeout(timeout);
    }, [displayText, isDeleting, speed, deleteSpeed, onComplete]);

    // Initial mount - type out the initial text
    useEffect(() => {
        if (displayText === '' && text) {
            targetTextRef.current = text;
        }
    }, []);

    return (
        <span className={className}>
            {displayText}
            <span className="animate-pulse">|</span>
        </span>
    );
}

// Simpler version that just types (no delete), for initial display
export function TypewriterSimple({
    text,
    speed = 25,
    className = '',
    showCursor = true,
}: {
    text: string;
    speed?: number;
    className?: string;
    showCursor?: boolean;
}) {
    const [displayText, setDisplayText] = useState('');
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        setDisplayText('');
        setIsComplete(false);

        let index = 0;
        const interval = setInterval(() => {
            if (index < text.length) {
                setDisplayText(text.slice(0, index + 1));
                index++;
            } else {
                setIsComplete(true);
                clearInterval(interval);
            }
        }, speed);

        return () => clearInterval(interval);
    }, [text, speed]);

    return (
        <span className={className}>
            {displayText}
            {showCursor && !isComplete && <span className="animate-pulse">|</span>}
        </span>
    );
}

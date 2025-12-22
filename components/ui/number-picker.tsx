'use client';

import { useRef, useEffect, useState, useCallback } from 'react';

interface HorizontalPickerProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    label?: string;
}

export function NumberWheel({
    value,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    unit = '',
    label,
}: HorizontalPickerProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const itemWidth = 48;
    const [centerIndex, setCenterIndex] = useState(-1);
    const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

    // Generate values array
    const values: number[] = [];
    for (let i = min; i <= max; i += step) {
        values.push(i);
    }

    // Triple values for infinite scroll
    const tripleValues = [...values, ...values, ...values];
    const centerOffset = values.length;

    // Calculate which index is in the center
    const calculateCenterIndex = useCallback(() => {
        if (!scrollRef.current || !containerRef.current) return -1;
        const containerWidth = containerRef.current.offsetWidth;
        const scrollLeft = scrollRef.current.scrollLeft;
        const paddingWidth = (containerWidth / 2) - (itemWidth / 2);
        const centerPosition = scrollLeft + paddingWidth;
        return Math.round(centerPosition / itemWidth);
    }, [itemWidth]);

    // Get the actual value from an index
    const getValueFromIndex = useCallback((index: number) => {
        const actualIndex = ((index % values.length) + values.length) % values.length;
        return values[actualIndex];
    }, [values]);

    // Handle scroll - update value IMMEDIATELY, debounce infinite scroll reset
    const handleScroll = useCallback(() => {
        const newCenterIndex = calculateCenterIndex();
        setCenterIndex(newCenterIndex);

        // Update value immediately (no debounce, no stale comparison)
        const newValue = getValueFromIndex(newCenterIndex);
        if (newValue !== undefined) {
            onChange(newValue);
        }

        // Debounce only the infinite scroll position reset
        if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
        scrollTimeout.current = setTimeout(() => {
            if (scrollRef.current && containerRef.current) {
                const scrollLeft = scrollRef.current.scrollLeft;
                const oneSetWidth = values.length * itemWidth;
                if (scrollLeft < oneSetWidth * 0.3 || scrollLeft > oneSetWidth * 2.7) {
                    const containerWidth = containerRef.current.offsetWidth;
                    const paddingWidth = (containerWidth / 2) - (itemWidth / 2);
                    const actualIndex = ((newCenterIndex % values.length) + values.length) % values.length;
                    const targetIndex = centerOffset + actualIndex;
                    scrollRef.current.scrollLeft = targetIndex * itemWidth - paddingWidth;
                }
            }
        }, 200);
    }, [calculateCenterIndex, getValueFromIndex, onChange, values, centerOffset, itemWidth]);

    // Position picker when value changes (initial + when switching exercises)
    useEffect(() => {
        if (scrollRef.current && containerRef.current) {
            const containerWidth = containerRef.current.offsetWidth;
            const paddingWidth = (containerWidth / 2) - (itemWidth / 2);

            // Calculate index from value using min/step (stable props)
            const valueIndex = Math.round((value - min) / step);
            const clampedIndex = Math.max(0, Math.min(valueIndex, values.length - 1));
            const targetIndex = centerOffset + clampedIndex;
            const targetScrollLeft = targetIndex * itemWidth - paddingWidth;

            // Smooth scroll to new position
            scrollRef.current.scrollTo({
                left: targetScrollLeft,
                behavior: 'smooth'
            });
            setCenterIndex(targetIndex);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, min, step, centerOffset, itemWidth]);

    const formatNumber = (n: number) => Number.isInteger(n) ? n.toString() : n.toFixed(1);

    return (
        <div className="flex flex-col">
            {/* Label above */}
            {label && (
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 text-center">
                    {label}
                </span>
            )}
            <div ref={containerRef} className="relative overflow-hidden">
                {/* Fade edges */}
                <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white dark:from-[#1a1a1a] to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white dark:from-[#1a1a1a] to-transparent z-10 pointer-events-none" />

                {/* Scroll container with CSS snap */}
                <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => e.stopPropagation()}
                    className="flex overflow-x-auto overflow-y-hidden scrollbar-hide snap-x snap-mandatory"
                    style={{
                        WebkitOverflowScrolling: 'touch',
                        scrollSnapType: 'x mandatory',
                        touchAction: 'pan-x',
                        overscrollBehavior: 'contain',
                    }}
                >
                    {tripleValues.map((v, index) => {
                        const isCenter = index === centerIndex;
                        const distance = Math.abs(index - centerIndex);
                        const opacity = distance === 0 ? 1 : distance === 1 ? 0.4 : 0.25;
                        const scale = distance === 0 ? 1.3 : 1;

                        return (
                            <div
                                key={index}
                                className="shrink-0 flex items-center justify-center font-semibold snap-center"
                                style={{
                                    width: itemWidth,
                                    height: 36,
                                    opacity,
                                    transform: `scale(${scale})`,
                                    color: isCenter ? '#111' : '#999',
                                    fontWeight: isCenter ? 700 : 400,
                                    transition: 'transform 0.1s, opacity 0.1s',
                                    scrollSnapAlign: 'center',
                                }}
                            >
                                {formatNumber(v)}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

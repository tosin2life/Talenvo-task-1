"use client";
import { memo, useState, useCallback, useRef, useEffect } from "react";

const ITEM_HEIGHT = 88;
const OVERSCAN = 2;
const VIRTUAL_THRESHOLD = 20;

interface VirtualCardListProps<T> {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T, index: number) => React.ReactNode;
}

function VirtualCardListInner<T>({
  items,
  getKey,
  renderItem,
}: VirtualCardListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400);

  const rafRef = useRef<number | null>(null);
  const onScroll = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (containerRef.current) {
        setScrollTop(containerRef.current.scrollTop);
      }
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerHeight(el.clientHeight));
    ro.observe(el);
    setContainerHeight(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  const start = Math.max(
    0,
    Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN
  );
  const visibleCount = Math.ceil(containerHeight / ITEM_HEIGHT) + OVERSCAN * 2;
  const end = Math.min(items.length, start + visibleCount);
  const visibleItems = items.slice(start, end);
  const totalHeight = items.length * ITEM_HEIGHT;
  const offsetY = start * ITEM_HEIGHT;

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto overflow-x-hidden"
      onScroll={onScroll}
      style={{ minHeight: 120 }}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            transform: `translateY(${offsetY}px)`,
          }}
          className="flex flex-col gap-2"
        >
          {visibleItems.map((item, i) => (
            <div
              key={getKey(item)}
              style={{ height: ITEM_HEIGHT - 8, minHeight: ITEM_HEIGHT - 8 }}
            >
              {renderItem(item, start + i)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export const VirtualCardList = memo(VirtualCardListInner) as <T>(
  props: VirtualCardListProps<T>
) => React.ReactElement;

export { VIRTUAL_THRESHOLD };

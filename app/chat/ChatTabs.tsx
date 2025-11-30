// app/chat/ChatTabs.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

const tabs = [
  { slug: "general", label: "Général" },
  { slug: "safe-debate", label: "Safe Debate" },
  { slug: "stream", label: "Fil de conscience" },
];

type SliderStyle = { left: number; width: number; opacity: number };

export default function ChatTabs() {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [slider, setSlider] = useState<SliderStyle>({
    left: 0,
    width: 0,
    opacity: 0,
  });

  const activeIndex = tabs.findIndex((t) => pathname === `/chat/${t.slug}`);

  const measure = () => {
    const el = tabRefs.current[activeIndex];
    const parent = containerRef.current;
    if (!el || !parent) return;

    const parentRect = parent.getBoundingClientRect();
    const rect = el.getBoundingClientRect();

    setSlider({
      left: rect.left - parentRect.left,
      width: rect.width,
      opacity: 1,
    });
  };

  useLayoutEffect(() => {
    measure();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div
      ref={containerRef}
      className="
        relative flex items-center gap-1
        rounded-2xl bg-white/5 p-1
        ring-1 ring-white/10 shadow-inner
      "
      aria-label="Sélecteur de salons"
    >
      {/* Slider */}
      <div
        className="
          absolute top-1 bottom-1 rounded-xl
          bg-gradient-to-b from-indigo-500/90 to-indigo-600/90
          shadow-sm transition-all duration-300 ease-out
        "
        style={{
          transform: `translateX(${slider.left}px)`,
          width: slider.width,
          opacity: slider.opacity,
        }}
      />

      {tabs.map((tab, i) => {
        const href = `/chat/${tab.slug}`;
        const active = i === activeIndex;

        return (
          <Link
            key={tab.slug}
            href={href}
            ref={(node) => {
              tabRefs.current[i] = node;
            }}
            className={[
              "relative z-10 px-3.5 py-1.5 text-[12px] rounded-xl transition-colors duration-200",
              "outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70",
              active
                ? "text-white"
                : "text-slate-300 hover:text-white hover:bg-white/5",
            ].join(" ")}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

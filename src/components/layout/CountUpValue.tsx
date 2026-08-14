import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "@/lib/motion";

gsap.registerPlugin(useGSAP);

export function CountUpValue({ value }: { value: number | string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      if (typeof value !== "number" || prefersReducedMotion()) {
        el.textContent = String(value);
        return;
      }
      const obj = { n: 0 };
      gsap.to(obj, {
        n: value,
        duration: 0.7,
        ease: "power2.out",
        onUpdate: () => {
          el.textContent = String(Math.round(obj.n));
        },
      });
    },
    { dependencies: [value] },
  );

  return (
    <span ref={ref} className="tabular-nums">
      {value}
    </span>
  );
}

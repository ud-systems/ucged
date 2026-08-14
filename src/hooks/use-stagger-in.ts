import { type RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "@/lib/motion";

gsap.registerPlugin(useGSAP);

export function useStaggerIn(scope: RefObject<HTMLElement | null>, selector: string, deps: unknown[] = []) {
  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;
      const items = root.querySelectorAll(selector);
      if (!items.length) return;

      if (prefersReducedMotion()) {
        gsap.set(items, { autoAlpha: 1, y: 0 });
        return;
      }

      gsap.from(items, {
        autoAlpha: 0,
        y: 12,
        duration: 0.35,
        stagger: 0.04,
        ease: "power3.out",
        clearProps: "transform",
      });
    },
    { scope, dependencies: deps, revertOnUpdate: true },
  );
}

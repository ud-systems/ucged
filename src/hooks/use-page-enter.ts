import { type RefObject } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { prefersReducedMotion } from "@/lib/motion";

gsap.registerPlugin(useGSAP);

export function usePageEnter(scope: RefObject<HTMLElement | null>) {
  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;
      const children = Array.from(root.children);
      if (!children.length) return;

      if (prefersReducedMotion()) {
        gsap.set(children, { autoAlpha: 1, y: 0 });
        return;
      }

      const header = root.querySelector("[data-page-header]");
      const rest = children.filter((el) => el !== header);
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      if (header) {
        tl.from(header, { autoAlpha: 0, y: 16, duration: 0.4, clearProps: "transform" });
      }
      if (rest.length) {
        tl.from(rest, { autoAlpha: 0, y: 12, duration: 0.35, stagger: 0.05, clearProps: "transform" }, header ? "-=0.22" : 0);
      }
    },
    { scope },
  );
}

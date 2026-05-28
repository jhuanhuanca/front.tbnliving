/**
 * Directiva v-reveal: animaciones de entrada/salida al hacer scroll (IntersectionObserver).
 * Uso: v-reveal | v-reveal:left | v-reveal:scale  o  v-reveal="{ variant: 'up', repeat: false }"
 */
export function useScrollReveal() {
  const vReveal = {
    mounted(el, binding) {
      const variant =
        binding?.value?.variant || binding?.arg || "up";
      const repeat = binding?.value?.repeat === true;
      const delay = Number(binding?.value?.delay || 0);

      el.classList.add("lp-reveal", `lp-reveal--${variant}`);
      if (delay > 0) {
        el.style.transitionDelay = `${delay}ms`;
      }

      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              el.classList.add("lp-reveal--in");
              if (!repeat) {
                io.unobserve(el);
              }
            } else if (repeat) {
              el.classList.remove("lp-reveal--in");
            }
          });
        },
        { threshold: 0.1, rootMargin: "0px 0px -8% 0px" }
      );

      io.observe(el);
      el._lpRevealIo = io;
    },
    unmounted(el) {
      el._lpRevealIo?.disconnect();
      delete el._lpRevealIo;
    },
  };

  return { vReveal };
}

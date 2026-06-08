"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

export function SiteLoader() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show on first visit per session
    if (sessionStorage.getItem("brightex_loaded")) return;
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem("brightex_loaded", "1");
    }, 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="site-loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="fixed inset-0 z-[9999] bg-brand-navy flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <Image
              src="/assets/Brightex Solutions Logo-light-v1-no-bg.png"
              alt="Brightex Solutions"
              width={220}
              height={56}
              priority
              className="h-14 w-auto"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

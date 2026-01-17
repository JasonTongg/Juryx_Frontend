import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function Navbar() {
  return (
    <div className="bg-whitee text-black w-full flex items-center justify-center">
      <motion.div
        initial={{ transform: "translateX(-100px)", opacity: 0 }}
        whileInView={{ transform: "translateX(0px)", opacity: 1 }}
        exit={{ transform: "translateX(-100px)", opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-2"
      >
        <p>Make with &hearts; by <Link href="https://www.linkedin.com/in/jason-tong-42600319a/" target="_blank" className="font-bold">Jason</Link></p>
      </motion.div>
    </div>
  );
}

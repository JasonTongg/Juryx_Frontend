import Image from "next/image";
import React from "react";
import Logo from "../public/assets/Logo.webp";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Navbar() {
  return (
    <nav className="flex w-full z-[99] p-4 items-center justify-between gap-4 padding-section fixed max-w-screen-2xl px-4 sm:px-6 lg:px-8 top-0 left-1/2 translate-x-[-50%]">
      <Image src={Logo} className="w-[65px]" />
      <ConnectButton showBalance={false} />
    </nav>
  );
}

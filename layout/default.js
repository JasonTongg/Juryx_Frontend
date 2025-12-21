import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useSelector, useDispatch } from "react-redux";
import { fetchDexscreener, fetchDextools, fetchUniswap } from "../store/data";

export default function Default({ children }) {
  const dispatch = useDispatch();
  const {
    twitter,
    telegram,
    address,
    dexscreenerUrl,
    uniswapUrl,
    dextoolsUrl,
    pairAddress,
  } = useSelector((state) => state.data);
  dispatch(fetchDexscreener(address));
  dispatch(fetchDextools(pairAddress));
  dispatch(fetchUniswap(address));

  const [isMounted, setIsMounted] = useState(false);

  const additionalProps = {
    address,
    twitter,
    telegram,
    dextoolsUrl,
    uniswapUrl,
    dexscreenerUrl,
  };

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  if (!isMounted) return null;

  return (
    <main className="flex flex-col items-center justify-between w-full min-h-screen overflow-x-hidden relative">
      <Navbar {...additionalProps} />
      {children}
      <Footer />
    </main>
  );
}

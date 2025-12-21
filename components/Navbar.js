import Link from "next/link";
import Image from "next/image";
import React from "react";
import Logo from "../public/assets/Logo.webp";
import { GiHamburgerMenu } from "react-icons/gi";
import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

export default function Navbar({
  address,
  twitter,
  telegram,
  dextoolsUrl,
  uniswapUrl,
  dexscreenerUrl,
}) {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };
  return (
    <nav className="flex w-full z-[99] p-4 items-center justify-between gap-4 padding-section fixed max-w-screen-2xl px-4 sm:px-6 lg:px-8 top-0 left-1/2 translate-x-[-50%]">
      <Image src={Logo} className="w-[65px]" />
      <div className="items-center justify-center gap-5 md:flex hidden">
        <Link href="#about">About</Link>
        <Link href="#how">How to Buy</Link>
        <Link href="#token">Tokenomics</Link>
        <Link href="#social">Social</Link>
      </div>
      <Link
        href={uniswapUrl}
        target="_blank"
        className="text-primary py-2 px-4 border-2 border-primary rounded-[20px] font-bold md:block hidden"
      >
        BUYNOW
      </Link>
      <GiHamburgerMenu
        className="text-3xl md:hidden block cursor-pointer"
        onClick={handleClick}
      />
      <Menu
        id="basic-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          "aria-labelledby": "basic-button",
        }}
      >
        <div className="bg-black text-white">
          <Link href="#about" onClick={handleClose}>
            <MenuItem>About</MenuItem>
          </Link>
          <Link href="#how" onClick={handleClose}>
            <MenuItem>How to Buy</MenuItem>
          </Link>
          <Link href="#token" onClick={handleClose}>
            <MenuItem>Tokenomics</MenuItem>
          </Link>
          <Link href="#social" onClick={handleClose}>
            <MenuItem>Social</MenuItem>
          </Link>
          <Link href={twitter} onClick={handleClose} target="_blank">
            <MenuItem>Twitter</MenuItem>
          </Link>
          <Link href={telegram} onClick={handleClose} target="_blank">
            <MenuItem>Telegram</MenuItem>
          </Link>
          <Link href={uniswapUrl} onClick={handleClose} target="_blank">
            <MenuItem>Uniswap</MenuItem>
          </Link>
          <Link href={dextoolsUrl} onClick={handleClose} target="_blank">
            <MenuItem>Dextools</MenuItem>
          </Link>
          <Link href={dexscreenerUrl} onClick={handleClose} target="_blank">
            <MenuItem>Dexscreener</MenuItem>
          </Link>
        </div>
      </Menu>
    </nav>
  );
}

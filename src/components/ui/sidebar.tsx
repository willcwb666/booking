"use client";

import { cn } from "@/lib/utils";
import Link, { LinkProps } from "next/link";
import React, { useState, createContext, useContext } from "react";
import { Menu, X } from "./icons";

export interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = (props: React.ComponentProps<"div">) => {
  return (
    <>
      <DesktopSidebar {...props} />
      <MobileSidebar {...props} />
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen, animate } = useSidebar();
  return (
    <div
      className={cn(
        "h-full px-3 py-4 hidden md:flex md:flex-col bg-slate-50/90 text-slate-800 border-r border-slate-200/80 shrink-0 sticky top-0 z-40 transition-all duration-300 ease-in-out backdrop-blur-xs",
        animate ? (open ? "w-[280px]" : "w-[72px]") : "w-[280px]",
        className
      )}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      {...props}
    >
      {children}
    </div>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  return (
    <div className="flex flex-row md:hidden items-center justify-between bg-slate-50 px-4 py-3 border-b border-slate-200 w-full sticky top-0 z-40">
      <div className="flex items-center justify-between z-20 w-full">
        <span className="font-bold text-slate-900 text-sm">Painel do Cliente</span>
        <button
          type="button"
          aria-label="Abrir Menu Lateral"
          onClick={() => setOpen(!open)}
          className="p-1 text-slate-700 hover:text-indigo-600 cursor-pointer"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {open && (
        <div
          className={cn(
            "fixed h-full w-full inset-0 bg-white p-6 z-[100] flex flex-col justify-between overflow-y-auto text-left transition-all duration-300 animate-fadeIn shadow-2xl",
            className
          )}
          {...props}
        >
          <button
            type="button"
            aria-label="Fechar Menu Lateral"
            className="absolute right-6 top-6 z-50 text-slate-400 hover:text-slate-900 cursor-pointer"
            onClick={() => setOpen(!open)}
          >
            <X className="h-6 w-6" />
          </button>
          {children}
        </div>
      )}
    </div>
  );
};

export const SidebarLink = ({
  link,
  className,
  onClick,
  ...props
}: {
  link: Links;
  className?: string;
  onClick?: () => void;
  props?: LinkProps;
}) => {
  const { open, animate } = useSidebar();
  return (
    <Link
      href={link.href}
      onClick={onClick}
      className={cn(
        "flex items-center justify-start gap-3 group/sidebar py-2.5 px-3 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-all cursor-pointer",
        className
      )}
      {...props}
    >
      <div className="shrink-0 text-slate-400 group-hover/sidebar:text-indigo-600 transition-colors">
        {link.icon}
      </div>
      <span
        className={cn(
          "text-xs font-medium group-hover/sidebar:translate-x-0.5 transition-all duration-200 whitespace-pre inline-block !p-0 !m-0",
          animate ? (open ? "opacity-100 inline-block" : "opacity-0 hidden") : "opacity-100 inline-block"
        )}
      >
        {link.label}
      </span>
    </Link>
  );
};

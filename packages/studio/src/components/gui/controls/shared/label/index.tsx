import { classes } from "../../../../../utils/classes";

export function HoverLabel({ className, children, pop, ...props }) {
  return (
    <div className={classes("relative group", className)} {...props}>
      <div className="pointer-events-none hidden group-hover:block">{pop}</div>
      {children}
    </div>
  );
}

export function SimpleLabel({ children }) {
  return (
    <div className="absolute -translate-x-1/2 left-1/2 bottom-[calc(100%+10px)] h-7 bg-studio-darker rounded-[9px] text-white px-[9px] flex items-center justify-center text-[13px] font-normal leading-[15px] z-10">
      {children}
    </div>
  );
}

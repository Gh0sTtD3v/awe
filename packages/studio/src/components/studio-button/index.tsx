import React, { ElementType, MouseEventHandler } from "react";

import { classes } from "../../utils/classes";
import Link from "next/link";

export interface StudioButtonProps {
    label?: string;
    title?: string;
    size?: string;
    onClick?: MouseEventHandler;
    gradientStart?: string;
    gradientStop?: string;
    image?: string;
    faded?: boolean;
    href?: string;
    target?: string;
    className?: string;
    children?: React.ReactNode;
}

export function StudioButton({
    label = null,
    title = null,
    size = "m",
    gradientStart = null,
    gradientStop = null,
    image = null,
    faded = false,
    href,
    className,
    onClick,
    children,
    ...rest
}: StudioButtonProps) {
    let style = null;

    if (gradientStart) {
        style = {
            background: `linear-gradient(0deg, ${gradientStart} 0%, ${gradientStop} 100%)`,
        };
    } else if (image) {
        style = { backgroundImage: `url(${image})` };
    }

    let TAG: ElementType = onClick ? "button" : "span";

    if (href) {
        TAG = Link;
    }

    const sizeClasses = {
        m: label ? "h-[42px] px-2.5" : "size-[42px]",
        l: !label && "size-[54px]",
    };

    return (
        <TAG
            className={classes(
                "studio-button rounded-xl border-0 bg-studio-dark flex items-center text-white",
                "shadow-[0px_-4px_12px_0px_rgba(53,53,53,0.4)_inset,0px_4px_12px_0px_rgba(6,6,6,0.3)]",
                "relative bg-no-repeat bg-cover bg-center",
                "transition-[background-color,box-shadow,color] duration-300 ease-out-quad",
                "before:transition-opacity before:duration-300 before:ease-out-quad",
                label && "gap-2.5",
                !label && "justify-center",
                sizeClasses[size],
                faded && "bg-transparent text-white/40 shadow-[0px_-4px_12px_0px_rgba(53,53,53,0)_inset,0px_4px_12px_0px_rgba(6,6,6,0)] before:opacity-0",
                gradientStart && "shadow-[0px_-4px_12px_0px_rgba(53,53,53,0.4)_inset,0px_4px_12px_0px_rgba(6,6,6,0.3),0px_0px_14px_0px_rgba(255,255,255,0.4)_inset]",
                "[&_.icon]:fill-current",
                "disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed",
                className
            )}
            onClick={onClick}
            title={title}
            style={style}
            // @ts-ignore
            href={href}
            {...rest}
        >
            {children}
            {label && (
                <span className="text-inherit text-[15px] font-medium leading-[17px]">
                    {label}
                </span>
            )}
        </TAG>
    );
}

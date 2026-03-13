import React from "react";
import { cn } from "../../utils/cn";
import { motion, AnimatePresence, cubicBezier, MotionProps } from "framer-motion";
import { usePromptTip } from "../../hooks/use-prompt-tip";

export function PromptTip() {
  const easeOutExpo = cubicBezier(0.5, 1, 0.89, 1);
  const { activePrompt, promptsHidden, showPrompt, hidePrompt } =
    usePromptTip();

  const isAbove = activePrompt?.position === "above";
  const isSharp = activePrompt?.position === "sharp";

  const MotionDiv = motion.div as React.ComponentType<
    MotionProps & React.HTMLAttributes<HTMLDivElement>
  >;

  return (
    <div
      className={cn(
        "fixed top-[80px] left-0 w-full z-10 text-white text-[13px] font-normal leading-[15px] flex justify-center pointer-events-none",
        "max-desktop:top-[74px]",
        "[@media(max-width:1024px)_and_(orientation:landscape)]:top-[18px]",
        // .avatar-container global styles
        "[&_.avatar-container]:!w-[26px] [&_.avatar-container]:h-[26px] [&_.avatar-container]:min-w-[26px] [&_.avatar-container]:min-h-[26px]",
        "[&_.avatar-container:first-child]:-ml-[6px]",
        "[&_.avatar-container+span]:ml-2",
        // .avatar-background global styles
        "[&_.avatar-background]:aspect-square [&_.avatar-background]:rounded-full",
        // .above variant
        isAbove && [
          "top-[18px] z-[2000000004]",
          "max-desktop:top-[18px]",
          "[@media(max-width:1024px)_and_(orientation:landscape)]:top-[18px]",
        ],
        // .sharp variant
        isSharp && "text-white"
      )}
    >
      <AnimatePresence mode="wait">
        {activePrompt?.message && !promptsHidden && (
          <MotionDiv
            className={cn(
              "px-3.5 h-[38px] block max-w-[84%] mx-auto text-center inline-flex items-center bg-[rgba(18,18,18,0.4)] rounded-xl shadow-[0px_2px_4px_0px_rgba(32,32,32,0.2)]",
              // i children styles
              "[&_i]:px-2 [&_i]:py-1 [&_i]:rounded-[30px] [&_i]:bg-studio-darker [&_i]:text-white [&_i]:text-[15px] [&_i]:not-italic [&_i]:font-bold [&_i]:leading-[13px] [&_i]:flex [&_i]:items-center [&_i]:justify-center [&_i]:min-h-[25px] [&_i]:min-w-[25px] [&_i]:mx-2",
              "[&_i:first-child]:ml-0",
              "[&_i:last-child]:mr-0",
              "[&_i+i]:-ml-1",
              // .above variant title
              isAbove && "bg-[rgba(255,255,255,0.4)]",
              // .sharp variant title
              isSharp && [
                "bg-[rgba(0,0,0,0.7)] rounded-none px-7 py-3",
                "[&_i]:rounded-sm [&_i]:border [&_i]:border-white [&_i]:bg-transparent",
              ]
            )}
            key={`prompt-${activePrompt?.id}-${activePrompt?.message}`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ease: easeOutExpo, duration: 0.4 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {activePrompt?.message}
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}

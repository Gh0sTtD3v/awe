import { memo } from "react";

import SpriteIcon from "../../../../ui/sprite";

function _SignalIndicator({ config }) {
  return (
    <div className="relative flex items-center min-h-[34px] h-[34px] rounded-lg bg-white/5 p-2.5 gap-2.5 border border-studio-success-bright/40 text-[11px] font-normal leading-[13px]">
      <SpriteIcon
        id="studio/emitter"
        width={14}
        height={14}
        className="text-studio-success-bright"
      />
      {config.name || config.event}
    </div>
  );
}

export const SignalIndicator = memo(_SignalIndicator);

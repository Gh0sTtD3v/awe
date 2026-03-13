import React, { memo } from "react";
import { classes } from "../../utils/classes";

export interface IconProps extends React.SVGAttributes<SVGElement> {
    id: string;
}

const Sprite = ({ className = "", id, ...props }) => {
    return (
        <svg className={classes("icon", `icon--${id}`, className)} {...props}>
            <use href={`#${id}`} />
        </svg>
    );
};

Sprite.displayName = "Sprite";

export default memo(Sprite);

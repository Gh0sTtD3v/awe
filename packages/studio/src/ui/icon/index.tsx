import React from "react";

import dynamic from "next/dynamic";
import { cn } from "../../utils/cn";

// Component
const Icon = (props) => {
  /**
   * Properties:
   */
  const { className, name, width, height, folder, ...rest } = props;

  /**
   * Dynamic Import:
   */
  const Component = dynamic(
    () => import(`./Icons/${folder ? `${folder}/${name}` : name}.tsx`),
    {
      ssr: false,
    }
  );

  /**
   * Dynamic Classnames:
   */
  const classNames = cn(className, "block [&_svg]:block", "icon", `icon--${name}`);

  /**
   * Inline CSS:
   */
  const inlineStyles = {
    width: `${width}px`,
    height: `${height}px`,
  };

  /**
   * DOM:
   */
  return (
    Component && (
      <span style={inlineStyles} className={classNames}>
        <Component width={width} height={height} {...rest} />
      </span>
    )
  );
};

// Export Pure Component
export default React.memo(Icon);

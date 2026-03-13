import { classes } from "../../utils/classes";
import { useContentTab } from "../../contexts/content-tab-context";

export function ContentTab({ display, collapsed, widthGetter, children }) {
  const { setActiveTab, setActiveEnvironment, setActiveCategory } =
    useContentTab();

  const onScriptBackdropClick = () => {
    setActiveTab(null);
    setActiveEnvironment(null);
    setActiveCategory(null);
  };

  return (
    <div
      className={classes(
        "w-auto pointer-events-none flex max-h-full first:max-w-full first:pointer-events-auto",
        display === "script" && "w-full first:w-auto first:flex-grow first:flex-shrink first:h-[calc(100vh-82px)] [&:first-child_.inner]:w-full [&:first-child_.inner]:gap-[6px] [&_.content]:w-full",
        display === "fullwidth" && "[&_.content]:w-full",
        "scrollbar-hidden"
      )}
    >
      {display === "script" && (
        <div className="pointer-events-auto absolute top-0 left-0 w-full h-full" onClick={onScriptBackdropClick} />
      )}
      <div className="flex flex-col w-full max-h-[calc(100vh-36px)]">
        <div className={classes("w-full h-full overflow-hidden flex flex-col min-h-0 [&>*]:pointer-events-auto [&_.content-tab]:h-full [&_.content-tab]:flex [&_.content-tab]:flex-col")}>{children}</div>
      </div>
    </div>
  );
}

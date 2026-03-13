import { useState, useRef, useEffect } from "react";

import dynamic from "next/dynamic";
import { classes } from "../../../utils/classes";
import { MIN_HEIGHT, useContentTab } from "../../../contexts/content-tab-context";
import { useWorldSelection } from "../../../hooks/use-world-selection";
import { Loading } from "../components/loading";
import { gsap } from "gsap";

// @ts-ignore
import { Draggable } from "../../../ui/utils/gsap/draggable-plugin";

if (typeof window !== "undefined") {
  gsap.registerPlugin(Draggable);
}
import { useGSAP } from "@gsap/react";

const Marketplace = dynamic(() => import("./marketplace"), {
  ssr: false,
  loading: () => <Loading />,
});

const Uploads = dynamic(() => import("./uploads"), {
  ssr: false,
  loading: () => <Loading />,
});

const Owned = dynamic(() => import("./owned"), {
  ssr: false,
  loading: () => <Loading />,
});

if (typeof window !== "undefined") {
  gsap.registerPlugin(Draggable);
}

const ComponentMap = (props) => {
  return {
    marketplace: <Marketplace {...props} />,
    uploads: <Uploads {...props} />,
    owned: <Owned {...props} />,
  };
};

export default function NewAddAssets() {
  const draggableRef = useRef(null);
  const boundsRef = useRef(null);
  const container = useRef(null);
  const divisionBounds = useRef(null);
  const horizontalResizer = useRef(null);
  const verticalResizerIntance = useRef(null);
  const content = useRef(null);

  const tabHeight = useRef(null);

  const [environment, setEnvironment] = useState("marketplace");
  // const [verticalResizerIntance, setVerticalResizerIntance] = useState(null);

  const {
    activeTab,
    activeCategory,
    activeGroup,
    addAssetsHeight,
    setAddAssetsHeight,
    setActiveTab,
    tabWidth,
    isReplaceToggled,
    setTabWidth,
    activeEnvironment,
  } = useContentTab();

  const [width, setWidth] = useState(tabWidth);

  const selection = useWorldSelection();

  const setTabHeight = (val) => {
    localStorage.setItem("addAssetsHeight", val);
    setAddAssetsHeight(val);
    tabHeight.current = val;
  };

  useEffect(() => {
    //
    if (isReplaceToggled) {
      if (
        selection?.singleSelected &&
        // @ts-ignore
        selection?.singleSelected?.data?.meta?.token_id &&
        selection?.singleSelected?.data?.type === "avatar"
      ) {
        //
        setEnvironment("owned");
      }
    }
  }, [isReplaceToggled, selection?.singleSelected]);

  useGSAP(() => {
    gsap.set(draggableRef.current, {
      x: tabWidth - 186,
    });

    Draggable.create(draggableRef.current, {
      type: "x",
      bounds: boundsRef.current,
      onDrag: function () {
        const w = 186 + Math.abs(this.x);
        setWidth(w);
      },
    });
  }, []);

  useEffect(() => {
    setTabWidth(width);
  }, [width]);

  useEffect(() => {
    setTabWidth(width);
  }, [environment]);

  useEffect(() => {
    setEnvironment(activeEnvironment);
  }, [activeEnvironment]);

  useGSAP(
    () => {
      if (!environment) return;
      const height = window.innerHeight - 82;

      // if (
      //     !selected?.data.id ||
      //     (selected?.data.id && !editPanelAttached)
      // ) {
      gsap.set(horizontalResizer.current, {
        y: `${addAssetsHeight}px`,
      });

      const instance = Draggable.create(horizontalResizer.current, {
        type: "y",
        bounds: divisionBounds.current,
        onDrag: function () {
          let newY = this.y;
          const h = Math.max(MIN_HEIGHT, newY);
          setTabHeight(h);
        },
      });

      verticalResizerIntance.current = instance;
      // }
    },
    {
      dependencies: [environment, activeTab, activeCategory, activeGroup],
      revertOnUpdate: true,
    }
  );

  const onResize = () => {
    if (verticalResizerIntance.current) {
      const h = Math.max(
        MIN_HEIGHT,
        Math.min(tabHeight.current, window.innerHeight)
      );

      setTabHeight(h);

      localStorage.setItem("addAssetsHeight", String(h));

      gsap.set(horizontalResizer.current, {
        y: `${h}px`,
      });

      verticalResizerIntance.current[0]?.applyBounds();
    }
  };

  useEffect(() => {
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [addAssetsHeight]);

  return (
    <div
      ref={container}
      className={classes("h-full flex flex-col relative [&_.official-card]:col-span-2 [&_.official-card_.card-figure]:aspect-[250/114]", width < 350 && "tab-small")}
      style={{ width: `${width}px` }}
    >
      {environment && (
        <div
          ref={content}
          className="relative flex-grow flex flex-col w-full overflow-hidden rounded-[10px] bg-studio-darker p-2 min-w-0 [&>.env]:h-full [&>.env]:flex-grow [&>.env]:min-w-0 [&>.env]:flex [&>.env]:flex-col [&>.env]:pb-[2px] [&>.env>.env-inner]:min-w-0 [&>.env>.env-inner]:flex [&>.env>.env-inner]:flex-col [&>.env_.scrollable-section]:flex-grow [&>.env_.custom-select-input]:bg-studio-dark [&>.env_.scrollable-wrapper]:flex-col [&>.env_.scrollable-wrapper]:px-[7px] [&>.env_.scrollable-wrapper:not(:last-child)]:mb-3 [&>.env>.tabs:not(:last-child)]:mb-[18px] [&>.env_.categories:not(:last-child)]:mb-3 [&>.env_.collapse-filters:not(:last-child)]:mb-[18px] [&>.env_.folder-card:not(:last-child)]:mb-3 [&>.env>.no-result]:flex-grow [&>.env>.no-result]:flex [&>.env>.no-result]:items-center [&>.env>.no-result]:justify-center [&>.env_.asset-cards-grid:not(:last-child)]:mb-2"
          style={{
            height: `${addAssetsHeight}px`,
          }}
        >
          {
            ComponentMap({
              //some props
              width,
            })[environment]
          }

          <div className="absolute bottom-0 left-0 h-[10px] w-full block bg-studio-darker flex-shrink-0 before:absolute before:left-[calc(50%-11px)] before:top-[2px] before:w-[22px] before:h-[3px] before:bg-studio-gray-medium-alt before:rounded-[3px] before:content-['']" />
          <div ref={horizontalResizer} className="absolute bottom-0 left-0 w-full h-[9px] !z-10 !cursor-row-resize !transform-none" />
        </div>
      )}

      <div ref={divisionBounds} className="fixed top-[161px] left-0 w-px h-[calc(100%-173px)] select-none pointer-events-none" />

      <button ref={draggableRef} type="button" className="flex absolute bottom-0 right-[-2px] !cursor-col-resize !z-[12] !transform-none overflow-hidden w-[6px] h-full !cursor-col-resize active:!cursor-grabbing">
        <span className="u-visually-hidden">Resize assets tab</span>
      </button>

      <div ref={boundsRef} className="fixed top-0 left-[calc(223px+81px)] w-[calc(408px-223px)] h-full select-none pointer-events-none" />
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { classes } from "../utils/classes";
import { StudioScene } from "./studio-scene";
import { GameDataProvider } from "../contexts/game-data-context";
import { EngineFacade } from "../utils/engine-api";
import { EditWorld } from "./edit-world";
import SpriteIcon from "../ui/sprite";
import { StudioButton } from "./studio-button";
import { usePromptTip } from "../hooks/use-prompt-tip";
import { useCurrentGameData } from "../contexts/game-data-context";
import { getComponentPrimaryGroup } from "../hooks/component-hooks";
import {
  EditoServiceProvider,
  useEditorService,
} from "../contexts/editor-service-context";
import { ContentTabProvider } from "../contexts/content-tab-context";
import { useContentTab } from "../contexts/content-tab-context";
import { TokenProvider } from "../contexts/token-context";
import logoSrc from "../assets/logo.png";

function StudioUI_Child() {
  //
  const promptTip = usePromptTip();

  const { gameData } = useCurrentGameData();
  const { setShowSettings } = useContentTab();
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [showWorldItems, setShowWorldItems] = useState(false);

  const {
    hideEditorUi,
    activeTab,
    setActiveTab,
    setActiveEnvironment,
    setActiveCategory,
  } = useContentTab();

  const { editor } = useEditorService();

  const countByType = useMemo(() => {
    if (!isEditorReady) return;
    //
    const countByType: Record<string, number> = {
      script: 0,
      worldItems: 0,
    };

    let i = 0;

    Object.values(gameData.components).forEach((it) => {
      //
      const group = getComponentPrimaryGroup(it);

      if (group == "scripts") {
        countByType["script"]++;
      }

      if (group) {
        i++;
      }
    });

    countByType.worldItems = i;

    return countByType;

    //
  }, [isEditorReady, gameData.components]);

  useEffect(() => {
    //

    const handler = (event) => {
      setIsEditorReady(event.state === EngineFacade.EDITOR_STATES.READY);
    };

    let dispose;

    //
    dispose = EngineFacade.on(
      EngineFacade.Events.EDITOR_STATE_CHANGED,
      handler
    );

    return () => {
      dispose?.();
    };
  }, []);

  return (
    <div
      className={classes(
        "studio-container fixed top-0 left-0 w-full h-full",
        "visible",
        hideEditorUi && "hideUi"
      )}
      style={{ userSelect: "none" }}
    >
      <div className="fixed top-0 left-0 px-3 h-16 w-full flex items-center justify-between z-[101]">
        <div className="flex items-center gap-2">
          <StudioButton target="_blank">
            <img
              src={typeof logoSrc === "string" ? logoSrc : logoSrc.src}
              width={24}
              height={24}
              alt="Logo"
            />
          </StudioButton>

          <StudioButton
            label="Add"
            onClick={() => {
              if (activeTab === "addAssetsV1") {
                setActiveTab(null);
              } else {
                setActiveTab("addAssetsV1");

                setActiveEnvironment("marketplace");
                setActiveCategory("official");
              }
            }}
            className="px-[10px] py-0"
            faded={activeTab != "addAssetsV1"}
          >
            <SpriteIcon id="studio/add-asset-filled" width={22} height={22} />
          </StudioButton>
        </div>

        <div className="flex items-center gap-2">
          <StudioButton
            title="Run the experience"
            onClick={() => {
              window.open(window.location.origin, "_blank");
            }}
          >
            <SpriteIcon id="play" width={18} height={18} />
          </StudioButton>
        </div>
      </div>
      <div
        className={classes(
          "studio-canvas absolute top-16 left-[6px] bottom-[6px] right-[6px] rounded-[14px] overflow-hidden transition-opacity duration-300 ease-out-quad",
          activeTab === "script" && "onScript"
        )}
      >
        <StudioScene game={gameData} />
      </div>

      <div
        className={classes(
          "studio-wrapper flex w-full h-full fixed top-0 left-0 transition-opacity duration-300 ease-out-quad pointer-events-none",
          showWorldItems && "world-items-visible"
        )}
      >
        <div className="studio-ui-click pointer-events-auto transition-opacity duration-100 ease-out-quad">
          {isEditorReady && (
            <EditWorld
              countByType={countByType}
              isEditorReady={isEditorReady}
              showWorldItems={showWorldItems}
              setShowWorldItems={setShowWorldItems}
              onSettings={() => setShowSettings(true)}
            />
          )}
        </div>
      </div>

      <div className="fixed top-0 left-0 w-full h-full z-[1000] bg-studio-black hidden items-center flex-col justify-center text-white text-center text-[15px] font-normal leading-[17px] max-[1024px]:max-h-[590px]:flex [&_svg]:mb-[25px]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="60"
          height="38"
          viewBox="0 0 60 38"
          fill="none"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M56.7568 0.989583H3.24324C2.0118 0.989583 1.01351 1.9643 1.01351 3.16667V34.8333C1.01351 36.0357 2.0118 37.0104 3.24324 37.0104H56.7568C57.9882 37.0104 58.9865 36.0357 58.9865 34.8333V3.16667C58.9865 1.9643 57.9882 0.989583 56.7568 0.989583ZM3.24324 0C1.45205 0 0 1.41776 0 3.16667V34.8333C0 36.5822 1.45205 38 3.24324 38H56.7568C58.5479 38 60 36.5822 60 34.8333V3.16667C60 1.41777 58.5479 0 56.7568 0H3.24324Z"
            fill="white"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M52.434 19C52.1213 19 51.8679 19.2534 51.8679 19.566L51.8679 29.0674L42.3843 19.5838C42.1632 19.3627 41.8048 19.3627 41.5838 19.5838C41.3627 19.8048 41.3627 20.1632 41.5838 20.3843L51.0674 29.8679L41.566 29.8679C41.2534 29.8679 41 30.1213 41 30.434C41 30.7466 41.2534 31 41.566 31L52.434 31C52.7466 31 53 30.7466 53 30.434L53 19.566C53 19.2534 52.7466 19 52.434 19Z"
            fill="white"
          />
        </svg>
        It's too tight in here!
        <br />
        Resize your window to continue.
      </div>
    </div>
  );
}

export function StudioUI({ game }) {
  return (
    <GameDataProvider gameData={game}>
      <EditoServiceProvider>
        <ContentTabProvider>
          <TokenProvider>
            <StudioUI_Child />
          </TokenProvider>
        </ContentTabProvider>
      </EditoServiceProvider>
    </GameDataProvider>
  );
}

import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigationUi } from "../hooks/use-navigation-ui";

export const MIN_HEIGHT = 500;

type ContentTabContextState = {
  tabWidth: number;
  rightBarWidth: number;
  rightBarDivider: Array<any>;
  activeTab: string;
  activeCategory: string;
  activeGroup: string;
  activeSecondTab: string;
  preventChanges: boolean;
  isReplaceToggled: boolean;
  isReplaceLocked: boolean;
  activeTabCollapsed: boolean;
  activeSecondTabCollapsed: boolean;
  hideEditorUi: boolean;
  editPanelAttached: boolean;
  editPanelAttachedHeight: number;
  editComponentMaxHeight: number;
  editComponentHasResized: boolean;
  singleWorldItemsHeight: number;
  addAssetsHeight: number;
  editComponentTopPos: number;
  editComponentLeftPos: number;
  showSettings: boolean;
  //
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;
  setActiveCategory: React.Dispatch<React.SetStateAction<string>>;
  setActiveGroup: React.Dispatch<React.SetStateAction<string>>;
  setActiveSecondTab: React.Dispatch<React.SetStateAction<string>>;
  setActiveTabCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveSecondTabCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  setTabWidth: React.Dispatch<React.SetStateAction<number>>;
  setRightBarWidth: React.Dispatch<React.SetStateAction<number>>;
  setRightBarDivider: React.Dispatch<React.SetStateAction<[number, number]>>;
  setShowSettings: React.Dispatch<React.SetStateAction<boolean>>;
  setIsReplaceToggled: React.Dispatch<React.SetStateAction<boolean>>;
  setIsReplaceLocked: React.Dispatch<React.SetStateAction<boolean>>;
  setPreventChanges: React.Dispatch<React.SetStateAction<boolean>>;
  setHideEditorUi: React.Dispatch<React.SetStateAction<boolean>>;
  setEditPanelAttached: React.Dispatch<React.SetStateAction<boolean>>;
  setEditPanelAttachedHeight: React.Dispatch<React.SetStateAction<number>>;
  setEditComponentTopPos: React.Dispatch<React.SetStateAction<number>>;
  setEditComponentLeftPos: React.Dispatch<React.SetStateAction<number>>;
  setEditComponentMaxHeight: React.Dispatch<React.SetStateAction<number>>;
  setEditComponentHasResized: React.Dispatch<React.SetStateAction<boolean>>;
  setSingleWorldItemsHeight: React.Dispatch<React.SetStateAction<number>>;
  setAddAssetsHeight: React.Dispatch<React.SetStateAction<number>>;

  // Studio V1.5
  activeEnvironment: string;
  setActiveEnvironment: React.Dispatch<React.SetStateAction<string>>;
};

export const ContentTabContext = createContext<ContentTabContextState>(null);

export const ContentTabProvider = ({ children }) => {
  const [tabWidth, setTabWidth] = useState(290);
  const [rightBarWidth, setRightBarWidth] = useState(243);
  const [rightBarDivider, setRightBarDivider] = useState([50, 50]);
  const [singleWorldItemsHeight, setSingleWorldItemsHeight] = useState(100);

  const [showSettings, setShowSettings] = useState(false);

  const [activeTab, setActiveTab] = useState("addAssetsV1");
  const [activeSecondTab, setActiveSecondTab] = useState(null);
  const [hideEditorUi, setHideEditorUi] = useState(false);

  const [activeEnvironment, setActiveEnvironment] = useState("marketplace");
  const [activeCategory, setActiveCategory] = useState("official");

  const [activeGroup, setActiveGroup] = useState(null);

  const [editPanelAttached, setEditPanelAttached] = useState(true);
  const [editPanelAttachedHeight, setEditPanelAttachedHeight] = useState(0);

  const [editComponentTopPos, setEditComponentTopPos] = useState(0);
  const [editComponentLeftPos, setEditComponentLeftPos] = useState(0);
  const [editComponentMaxHeight, setEditComponentMaxHeight] = useState(null);
  const [editComponentHasResized, setEditComponentHasResized] = useState(false);

  const [activeTabCollapsed, setActiveTabCollapsed] = useState(false);

  const [activeSecondTabCollapsed, setActiveSecondTabCollapsed] =
    useState(false);

  const [preventChanges, setPreventChanges] = useState(false);

  const [isReplaceToggled, setIsReplaceToggled] = useState(false);
  const [isReplaceLocked, setIsReplaceLocked] = useState(false);

  const [addAssetsHeight, setAddAssetsHeight] = useState(455);

  const { setPreventHover } = useNavigationUi();

  const state: ContentTabContextState = {
    tabWidth,
    rightBarWidth,
    rightBarDivider,
    activeTab,
    activeGroup,
    activeSecondTab,
    activeTabCollapsed,
    activeSecondTabCollapsed,
    preventChanges,
    isReplaceToggled,
    isReplaceLocked,
    hideEditorUi,
    activeCategory,
    editPanelAttached,
    editPanelAttachedHeight,
    // editComponentWasDragged,
    editComponentTopPos,
    editComponentLeftPos,
    editComponentMaxHeight,
    editComponentHasResized,
    singleWorldItemsHeight,
    addAssetsHeight,
    showSettings,
    setTabWidth,
    setRightBarWidth,
    setRightBarDivider,
    setActiveTab,
    setActiveGroup,
    setActiveSecondTab,
    setActiveTabCollapsed,
    setActiveSecondTabCollapsed,
    setActiveCategory,
    setPreventChanges,
    setIsReplaceToggled,
    setIsReplaceLocked,
    setHideEditorUi,
    setEditPanelAttached,
    setEditPanelAttachedHeight,
    // setEditComponentWasDragged,
    setEditComponentTopPos,
    setEditComponentLeftPos,
    setEditComponentMaxHeight,
    setEditComponentHasResized,
    setSingleWorldItemsHeight,
    setAddAssetsHeight,
    // Studio V1.5
    activeEnvironment,
    setActiveEnvironment,
    setShowSettings,
  };

  useEffect(() => {
    if (activeSecondTab) {
      setActiveTabCollapsed(true);

      setActiveSecondTabCollapsed(false);
    } else if (activeTab) {
      setActiveSecondTabCollapsed(true);
      setActiveTabCollapsed(false);
    }
  }, [activeSecondTab, activeTab]);

  useEffect(() => {
    if (isReplaceToggled && activeTab !== "addAssetsV1") {
      setIsReplaceToggled(false);
      setIsReplaceLocked(false);
    }
  }, [activeTab, isReplaceToggled]);

  useEffect(() => {
    if (activeTab) {
      setPreventHover(true);
    } else {
      setPreventHover(false);
    }

    // if (activeTab === "script") {
    //     EngineFacade.editor.selection.setSelection([]);
    // }
  }, [activeTab]);

  useEffect(() => {
    const addAssetsHeightStorage = localStorage.getItem("addAssetsHeight");

    if (addAssetsHeightStorage) {
      setAddAssetsHeight(Math.max(MIN_HEIGHT, Number(addAssetsHeightStorage)));
    }
  }, []);

  return (
    <ContentTabContext.Provider value={state}>
      {children}
    </ContentTabContext.Provider>
  );
};

export const useContentTab = () => {
  //
  const context = useContext(ContentTabContext);

  if (!context) {
    throw Error("useContentTab needs to be called within ContentTabContext.");
  }

  return context;
};

export default ContentTabProvider;

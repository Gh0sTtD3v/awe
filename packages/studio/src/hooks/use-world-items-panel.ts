import { ImmerStore, useImmerStore } from "./use-immer-store";

// const BASE_WIDTH = 243;

const worldItemsPanelStore = new ImmerStore({
  // width: BASE_WIDTH,
  search: "",
  scrollTop: 0,
  mouseIsDragging: false,
  mouseIsMoving: false,
  mouseIsHovering: false,
  lastDirectClickedItemId: null,
  selectedObjectsAreTopLevel: null,
  openCollapseIds: [],
  draggedItemsIds: [],

  reorderingParentId: null,
  reorderingTargetParentId: null,
});

export function useWorldItemsPanel() {
  const { state, update } = useImmerStore(worldItemsPanelStore);

  return {
    // width: state.width,
    // setWidth: (value) => {
    //     update((state) => {
    //         state.width = value;
    //     });
    // },

    // SEARCH
    search: state.search,
    setSearch: (value) => {
      update((state) => {
        state.search = value;
      });
    },

    // SCROLL
    scrollTop: state.scrollTop,
    setScrollTop: (value) => {
      update((state) => {
        state.scrollTop = value;
      });
    },

    // MOUSE features
    mouseIsDragging: state.mouseIsDragging,
    setMouseIsDragging: (value) => {
      update((state) => {
        state.mouseIsDragging = value;
      });
    },
    mouseIsMoving: state.mouseIsMoving,
    setMouseIsMoving: (value) => {
      update((state) => {
        state.mouseIsMoving = value;
      });
    },
    mouseIsHovering: state.mouseIsHovering,
    setMouseIsHovering: (value) => {
      update((state) => {
        state.mouseIsHovering = value;
      });
    },

    // CMD+CLICK / MAJ+CLICK feature
    lastDirectClickedItemId: state.lastDirectClickedItemId,
    setLastDirectClickedItemId: (value) => {
      update((state) => {
        state.lastDirectClickedItemId = value;
      });
    },
    selectedObjectsAreTopLevel: state.selectedObjectsAreTopLevel,
    setSelectedObjectsAreTopLevel: (value) => {
      update((state) => {
        state.selectedObjectsAreTopLevel = value;
      });
    },

    reorderingParentId: state.reorderingParentId,
    setReorderingParentId: (value) => {
      update((state) => {
        state.reorderingParentId = value;
      });
    },

    openCollapseIds: state.openCollapseIds,
    setOpenCollapseIds: (value) => {
      update((state) => {
        state.openCollapseIds = value;
      });
    },

    draggedItemsIds: state.draggedItemsIds,
    setDraggedItemsIds: (value) => {
      update((state) => {
        state.draggedItemsIds = value;
      });
    },
  };
}

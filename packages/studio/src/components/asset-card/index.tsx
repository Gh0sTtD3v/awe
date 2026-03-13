import { useContentTab } from "../../contexts/content-tab-context";

import { AssetCard as SharedAssetCard, AssetCardProps } from "../../ui/asset-card";

export function AssetCard(props: AssetCardProps) {
  //
  const { setHideEditorUi } = useContentTab();

  return <SharedAssetCard {...props} setHideEditorUi={setHideEditorUi} />;
}

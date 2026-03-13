import dynamic from "next/dynamic";
import React, { useState, useEffect } from "react";
import { useContentTab } from "../../../../contexts/content-tab-context";
import { useWorldSelection } from "../../../../hooks/use-world-selection";
import { Loading } from "../../components/loading";

const Official = dynamic(
  () => import("./official"),
  {
    ssr: false,
    loading: () => <Loading />,
  }
);

const Model3D = dynamic(
  () => import("./3d"),
  {
    ssr: false,
    loading: () => <Loading />,
  }
);

const Avatars = dynamic(
  () => import("./avatars"),
  {
    ssr: false,
    loading: () => <Loading />,
  }
);

const ContentMap = (props) => {
  return {
    "3d": <Model3D {...props} />,
    avatars: <Avatars {...props} />,
    official: <Official {...props} />,
  };
};

export default function Marketplace({ width }) {
  //
  const [category, setCategory] = useState("official");

  const { setShowSettings, activeCategory } = useContentTab();

  useEffect(() => {
    setCategory(activeCategory);
  }, [activeCategory]);

  const selection = useWorldSelection();

  return (
    <div className="env">
      {ContentMap({ width, setShowSettings })[category]}
    </div>
  );
}

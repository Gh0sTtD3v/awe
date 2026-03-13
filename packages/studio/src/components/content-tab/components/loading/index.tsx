import React from "react";
import { LoadingSpinner } from "../../../../ui/loading-spinner";

import styles from "./index.module.css";

export function Loading() {
  return (
    <div className={styles.container}>
      <LoadingSpinner light width={22} height={22} />
    </div>
  );
}

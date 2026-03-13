import React from "react";

import styles from "./index.module.css";

export function NotFound({
  message = "It looks like your search came up empty. Try refining your criteria.",
}) {
  return (
    <div className={styles.container}>
      <span className={styles.message}>{message}</span>
    </div>
  );
}

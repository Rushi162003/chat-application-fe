"use client";

import dynamic from "next/dynamic";
import styles from "./LocationMessageCard.module.scss";

const LocationMap = dynamic(() => import("./Location.Map"), {
  ssr: false,
  loading: () => <div className={styles.mapSkeleton}>Loading map…</div>,
});

export default LocationMap;
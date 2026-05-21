"use client";

import AnimatedBackground from "./AnimatedBackground";
import styles from "./AnimatedShell.module.scss";

export default function AnimatedShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.root}>
      <AnimatedBackground />
      <div className={styles.rootContent}>{children}</div>
    </div>
  );
}

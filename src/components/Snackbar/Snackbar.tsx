"use client";

import cx from "classnames";
import { Familjen_Grotesk } from "next/font/google";
import React, { memo, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { miscStore } from "@/src/stores/miscStore";

import styles from "./Snackbar.module.scss";

const familjenGrotesk = Familjen_Grotesk({
    weight: ["400", "500"],
    subsets: ["latin"],
    style: ["normal", "italic"],
    display: "swap",
    preload: true,
    variable: "--font-family",
});

const DEFAULT_TIME = 4000;
const EXIT_ANIMATION_MS = 260;

const TYPE_CONFIG = {
    s: { icon: CheckCircle2, label: "Success", className: styles.rootSuccess },
    e: { icon: XCircle, label: "Error", className: styles.rootError },
    w: { icon: AlertTriangle, label: "Warning", className: styles.rootWarning },
    i: { icon: Info, label: "Info", className: styles.rootInfo },
} as const;

const Snackbar = ({ time = DEFAULT_TIME }: { time?: number }) => {
    const notification = miscStore((s) => s.notification);
    const setNotification = miscStore((s) => s.setNotification);
    const message = notification?.message;
    const type = notification?.type;

    const [show, setShow] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (message && message !== "WebSocket connection error") {
            setShow(true);
            const hideTimeout = setTimeout(() => setShow(false), time);
            const clearTimeout_ = setTimeout(
                () => setNotification(null),
                time + EXIT_ANIMATION_MS
            );
            return () => {
                clearTimeout(hideTimeout);
                clearTimeout(clearTimeout_);
            };
        }
        setShow(false);
    }, [notification, message, setNotification, time]);

    const handleDismiss = () => {
        setShow(false);
        setTimeout(() => setNotification(null), EXIT_ANIMATION_MS);
    };

    if (!message || !isMounted) return null;

    const portalsRoot =
        typeof document !== "undefined"
            ? document.getElementById("portals")
            : null;

    if (!portalsRoot) return null;

    const config = TYPE_CONFIG[(type as keyof typeof TYPE_CONFIG) || "i"] || TYPE_CONFIG.i;
    const Icon = config.icon;

    return ReactDOM.createPortal(
        <div
            role="status"
            aria-live="polite"
            className={cx(
                styles.root,
                config.className,
                show ? styles.rootShow : styles.rootHide,
                familjenGrotesk.className
            )}
        >
            <span className={styles.rootIcon} aria-hidden>
                <Icon size={18} strokeWidth={2.25} />
            </span>
            <div className={styles.rootBody}>
                <strong>{config.label}</strong>
                <p>{message}</p>
            </div>
            <button
                type="button"
                className={styles.rootClose}
                aria-label="Dismiss notification"
                onClick={handleDismiss}
            >
                <X size={15} />
            </button>
            <span
                className={styles.rootProgress}
                style={{ animationDuration: `${time}ms` }}
                aria-hidden
            />
        </div>,
        portalsRoot
    );
};

export default memo(Snackbar);

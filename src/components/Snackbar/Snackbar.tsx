import cx from "classnames";
import { Familjen_Grotesk } from "next/font/google";
import React, { memo, useEffect, useState } from "react";
import ReactDOM from "react-dom";
import Image from "next/image";
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
            const timeout = setTimeout(() => {
                setShow(false);
                setNotification(null);
            }, time);
            return () => clearTimeout(timeout);
        }
        setShow(false);
    }, [message, setNotification, time]);

    const barStyle = cx(
        styles.root,
        {
            [styles.rootWarning]: type === "w",
            [styles.rootSucess]: type === "s",
            [styles.rootError]: type === "e",
        },
        { [styles.show]: show }
    );

    if (!message || !isMounted) return null;

    const portalsRoot =
        typeof document !== "undefined"
            ? document.getElementById("portals")
            : null;

    if (!portalsRoot) return null;

    return ReactDOM.createPortal(
        <div className={cx(barStyle, familjenGrotesk.className)}>
            <p>{message}</p>
            <span
                role="button"
                tabIndex={0}
                onClick={() => {
                    setShow(false);
                    setNotification(null);
                }}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setShow(false);
                        setNotification(null);
                    }
                }}
            >
                <Image
                    src="/icon-cross.svg"
                    alt="Dismiss"
                    width={20}
                    height={20}
                />
            </span>
        </div>,
        portalsRoot
    );
};

export default memo(Snackbar);

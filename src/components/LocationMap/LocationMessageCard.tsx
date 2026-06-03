"use client";

import { ExternalLink, MapPin } from "lucide-react";
import LocationMapLazy from "./LocationMapLazy";
import styles from "./LocationMessageCard.module.scss";

type Props = {
  lat: number;
  lng: number;
};

export default function LocationMessageCard({ lat, lng }: Props) {
  const mapsUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.iconWrap} aria-hidden>
          <MapPin size={14} />
        </span>
        <span className={styles.title}>Shared location</span>
      </div>
      <div className={styles.mapWrap}>
        <LocationMapLazy lat={lat} lng={lng} className={styles.map} />
      </div>
      <a
        className={styles.link}
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        <ExternalLink size={14} />
        Open in maps
      </a>
    </div>
  );
}

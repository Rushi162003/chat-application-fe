"use client";

import { useEffect } from "react";
import { API_ENDPOINTS } from "@/src/common/enums";
import { axiosFetch } from "@/hooks/useAxios";
import { miscStore } from "@/src/stores/miscStore";

export default function AuthBootstrap() {
  const setMe = miscStore((state) => state.setMe);

  useEffect(() => {
    const fetchMe = async () => {
      const [me] = await axiosFetch({
        url: API_ENDPOINTS.ME,
        method: "GET",
      });
      if (me) {
        setMe(me);
      }
    };
    fetchMe();
  }, []);

  return null;
}

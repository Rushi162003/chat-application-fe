"use client";

import { useEffect, useState } from "react";
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from "axios";
import Cookies from "js-cookie";
// import { miscStore } from "@stores/miscStore/miscStore";

export interface UseAxiosOptions {
    axiosInstance?: AxiosInstance;
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"; // Specify the allowed HTTP methods
    url: string;
    requestConfig?: AxiosRequestConfig;
    fetch?: boolean;
}

const defaultAxiosInstance = axios.create({
    baseURL: "/api"
});

export const resetToken = async () => {
    // const router = useRouter();
    const refresh_token = Cookies.get("refresh");
    try {
        const response = await axios.post("/api/auth/login", { data: { refresh: refresh_token } });
        if (response.status === 200) {
            Cookies.set("refresh", response.data.refresh);
            Cookies.set("access", response.data.access);

            return response.data.access;
        }
    } catch (err) {
        if (axios.isAxiosError(err) && err.response!.status === 401) {
            Cookies.remove("refresh");
            Cookies.remove("access");
            if (typeof window !== "undefined") {
                window.location.reload();
            }
        }
    }
};

export const axiosFetch = async ({
    axiosInstance = defaultAxiosInstance,
    method,
    url,
    requestConfig
}: UseAxiosOptions) => {
    let response;
    let error;
    const user_id: string | number | undefined = undefined;
    const config = {
        method: method,
        url: url,
        headers: {
            Authorization: `Bearer ${Cookies.get("access")}`,
            ...(user_id ? { user_id } : {})
        },
        ...requestConfig
    };

    try {
        const res = await axiosInstance.request(config);

        response = res.data;
    } catch (err) {
        if (axios.isAxiosError(err) && (err.response?.statusText === "Unauthorized" || err.response?.status === 401)) {
            try {
                const accessToken = await resetToken();
                const newRequestConfig: AxiosRequestConfig = {
                    ...config,
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                };
                const res = await axiosInstance.request(newRequestConfig);
                response = res.data;
            } catch (e) {
                //TODO: handle error
            }
        } else {
            error = err;
        }
    }
    return [response, error];
};

export default function useAxios<T>({ method = "GET", url, requestConfig, fetch = true }: UseAxiosOptions) {
    // const router = useRouter();
    // eslint-disable-next-line
    const [response, setResponse] = useState<T | any>(); // Adjust the type of response
    const [error, setError] = useState<AxiosError>();
    const [loading, setLoading] = useState<boolean>(true);
    const [reFresh, setReFresh] = useState(true);

    const reload = () => {
        setReFresh(!reFresh);
    };

    useEffect(() => {
        setLoading(true);
        if (fetch)
            axiosFetch({
                method,
                url,
                requestConfig
            })
                .then(([data, err]) => {
                    if (err) {
                        setError(err);
                    } else {
                        setResponse(data);
                    }
                })
                .finally(() => {
                    setLoading(false);
                });
        else setLoading(false);
        //eslint-disable-next-line
    }, [reFresh]);

    return [response, loading, error, reload, setResponse] as const;
}

import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { BE_API_ENDPOINTS } from "@/src/common/enums";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  try {
    let responseData;
    const base = process.env.NEXT_PUBLIC_BE_API_URL ?? "";

    const response = await axios.post(
      base + BE_API_ENDPOINTS.LOGIN,
      req.body
    );
    responseData = response.data;
    res.status(200).json(responseData);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ message: "Internal server error" });
  }
}

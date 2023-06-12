import _axios, { AxiosHeaders } from "axios";

const headers = new AxiosHeaders();
// never cache
headers.set("Cache-Control", "no-cache, no-store, must-revalidate");

export const axios = _axios.create({ headers });

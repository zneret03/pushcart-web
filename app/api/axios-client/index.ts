import axios, { InternalAxiosRequestConfig } from 'axios';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL;

const isServer = typeof window === 'undefined';

const logInterceptor = async (req: InternalAxiosRequestConfig) => {
  if (isServer) {
    console.info('[AXIOS] [SERVER] ', req.url);
  } else {
    console.info('[AXIOS] [CLIENT] ', req.url);
  }
  return req;
};

const cookiesInterceptor = async (req: InternalAxiosRequestConfig) => {
  if (isServer) {
    const { cookies } = await import('next/headers');
    const cookiesString = await cookies();

    cookiesString
      .getAll()
      .map((item) => `${item.name}=${item.value}`)
      .join('; ');

    req.headers.cookie = cookiesString;
  }
  return req;
};

export const axiosService = axios.create({
  baseURL: baseUrl,
});

axiosService.interceptors.request.use(logInterceptor);
axiosService.interceptors.request.use(cookiesInterceptor);

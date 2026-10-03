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

    req.headers.cookie = cookiesString
      .getAll()
      .map((item) => `${item.name}=${item.value}`)
      .join('; ');
  }
  return req;
};

export const axiosService = axios.create({
  // Browser requests belong to the origin serving the tablet, not a build-time URL.
  baseURL: isServer ? baseUrl : undefined,
});

axiosService.interceptors.request.use(logInterceptor);
axiosService.interceptors.request.use(cookiesInterceptor);

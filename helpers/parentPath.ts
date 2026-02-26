export const parentPath = (pathname: string): string => {
  const segments = pathname.split('/');
  const parentPath = segments.slice(0, -1).join('/');

  return parentPath;
};

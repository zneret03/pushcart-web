export const avatarName = (email: string): string =>
  `${email?.charAt(0)}${email?.charAt(1)}`.toUpperCase();

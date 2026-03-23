import { JSX, ReactNode, ComponentProps } from 'react';
import { PreviousPage } from './PreviousPage';

interface Container extends ComponentProps<'div'> {
  children: ReactNode;
  title: string;
  description: string;
  childClassName?: string;
  isBack?: boolean;
  onClickBack?: () => void;
}

export const Container = ({
  children,
  title,
  description,
  childClassName,
  isBack,
  onClickBack,
  ...props
}: Container): JSX.Element => {
  return (
    <main className="space-y-4" {...props}>
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">{title}</h1>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
      {isBack && <PreviousPage />}
      <div className={childClassName}>{children}</div>
    </main>
  );
};

import { JSX, ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MenuOptions } from '@/lib/types/MenuOptions';

interface TabsContainer {
  children: ReactNode;
  currentStep: string;
  menuOptions: MenuOptions[];
  changeOnClick: (value: string) => void;
}

export function TabsContainer({
  children,
  currentStep,
  menuOptions,
  changeOnClick,
}: TabsContainer): JSX.Element {
  return (
    <Tabs
      onValueChange={(value) => changeOnClick(value)}
      defaultValue={currentStep}
      className="w-[400px]"
    >
      <TabsList>
        {menuOptions.map((item) => (
          <TabsTrigger key={item.value} value={item.value}>
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value={currentStep}>{children}</TabsContent>
    </Tabs>
  );
}

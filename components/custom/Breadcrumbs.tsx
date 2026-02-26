'use client';

import { JSX } from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  // BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  // BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import { usePathname } from 'next/navigation';

export function Breadcrumbs(): JSX.Element {
  const pathname = usePathname();
  const splitPathname = pathname.split('/');

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {splitPathname.map((item, index) => (
          <div className="flex items-center" key={`${index}-${item}`}>
            <BreadcrumbItem className={`${index === 1 && 'hidden md:block'}`}>
              {index === 3 && (
                <BreadcrumbPage className="-m-8 font-semibold capitalize">
                  {item}
                </BreadcrumbPage>
              )}
              {/* 
              {![0, 1].includes(1) && (
                <BreadcrumbPage>{capitalizeFirstLetter(item)}</BreadcrumbPage>
              )}
                */}
            </BreadcrumbItem>
            {/*![0, 3].includes(index) && (
              <BreadcrumbSeparator className='hidden md:block ml-2' />
            )*/}
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

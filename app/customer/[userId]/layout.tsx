import { ReactNode } from 'react';
import { AppSidebar } from '@/components/ui/app-sidebar';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { AuthProvider } from '@/context/AuthProvider';
import { Breadcrumbs } from '@/components/custom/Breadcrumbs';

export default async function CustomerLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            {/*<Separator orientation='vertical' className='mr-2 h-4' />*/}
            <Breadcrumbs />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          {/*
            `requireUser={false}`: this subtree is the customer-facing surface, and its entry point
            is the shared counter tablet at `/customer/guest/scan-start`. That screen signs an
            anonymous customer in itself, so it has to render for a visitor with no session - with
            the default it sat behind the provider's spinner and its Start shopping button could
            never be reached. The pages below still talk to session-protected routes, which is what
            actually gates the data.
          */}
          <AuthProvider requireUser={false}>{children}</AuthProvider>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

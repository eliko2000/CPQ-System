import React from 'react';
import { Sidebar } from './Sidebar';
import { UserMenu } from './UserMenu';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-background" dir="rtl">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Blue top bar with UserMenu on the left */}
        <div className="h-16 bg-primary flex items-center px-6 justify-between">
          <div className="flex items-center gap-4">
            {/* Empty space or logo could go here */}
          </div>
          <div className="flex items-center">
            <UserMenu />
          </div>
        </div>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}

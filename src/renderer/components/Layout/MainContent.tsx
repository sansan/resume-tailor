import React from 'react';

interface MainContentProps {
  children: React.ReactNode;
}

function MainContent({ children }: MainContentProps): React.JSX.Element {
  return (
    <main className="main-content">
      {children}
    </main>
  );
}

export default MainContent;

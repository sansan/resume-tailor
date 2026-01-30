import React from 'react';

export type TabId = 'resume' | 'job-application' | 'settings';

interface Tab {
  id: TabId;
  label: string;
}

const tabs: Tab[] = [
  { id: 'resume', label: 'Resume' },
  { id: 'job-application', label: 'Job Application' },
  { id: 'settings', label: 'Settings' },
];

interface HeaderProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

function Header({ activeTab, onTabChange }: HeaderProps): React.JSX.Element {
  return (
    <header className="header">
      <div className="header-title">
        <h1>Resume Creator</h1>
      </div>
      <nav className="header-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`nav-tab ${activeTab === tab.id ? 'nav-tab--active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </header>
  );
}

export default Header;

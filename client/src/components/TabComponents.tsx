import React, { ReactElement, useState } from "react";
import { TabItemProps, TabListProps } from "../types/TabTypes";
import './TabComponents.css'; // Ensure you import the CSS file

export const TabItem: React.FC<TabItemProps> = ({ name, children }) => (
    <div className="tab-panel" id={`${name}`}>{children}</div>
)

export const TabList: React.FC<TabListProps> = ({ children, activeTabIndex = 0 }) => {
    const [activeTab, setActiveTab] = useState(activeTabIndex);
    const handleTabClick = (index: number) => {
      setActiveTab(index);
    };
    const tabs = React.Children.toArray(children).filter(
        (child): child is ReactElement<TabItemProps> =>
          React.isValidElement(child) && child.type === TabItem
      );
    return (
      <div className="tabs">
        <nav className="tab-list-wrapper">
          <ul className="tab-list">
            {tabs.map((tab, index) => (
              <li key={`tab-${index}`}>
                <button
                  key={`tab-btn-${index}`}
                  id={`tab-${tab.props.name}`}
                  onClick={() => handleTabClick(index)}
                  className={`tab-btn ${
                    activeTab === index && "tab-btn--active"
                  }`}
                >{tab.props.name}</button>
              </li>
            ))}
          </ul>
        </nav>
        {tabs[activeTab]}
      </div>
    );
  };
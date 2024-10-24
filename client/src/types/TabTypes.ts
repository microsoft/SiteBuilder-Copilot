// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

// https://blog.logrocket.com/how-to-build-tab-component-react/
import { ReactElement, ReactNode } from "react";

export interface TabItemProps {
    name: string;
    children: ReactNode;
}

export interface TabListProps {
    activeTabIndex: number;
    children: ReactElement<TabItemProps> | ReactElement<TabItemProps>[];
    handleDownload: () => void;
    handleModal: (newIsOpen: boolean) => void;
    isChatVisible: boolean;
    setIsChatVisible: (isChatVisible: boolean) => void;
}
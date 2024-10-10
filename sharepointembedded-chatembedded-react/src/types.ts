/**
 * MIT License
 *
 * Copyright (c) Microsoft Corporation.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE
 */
export interface IHeader {
  title?: string;
  hideIcon?: boolean;
  showCloseButton?: boolean;
}

export interface ISelectionContext {
  Folder?: { name?: string }[];
  File?: { name?: string }[];
}

export interface ICustomPrompts {
  zeroQueryPrompts?: IZeroQueryPrompts;
  suggestedPrompts?: string[];
}

export interface IZeroQueryPrompts {
  headerText: string;
  promptSuggestionList?: ZeroQueryPromptSuggestion[];
}

export interface ZeroQueryPromptSuggestion {
  suggestionText: string;
  iconRegular?: IIconData;
  iconHover?: IIconData;
}

export interface IIconData {
  name: IconName;
  style?: IconStyle;
}

export enum IconName {
  ChatBubblesQuestion = 'ChatBubblesQuestion',
  DocumentCatchUp = 'DocumentCatchUp',
  Notepad = 'Notepad',
  Search = 'Search'
}

export enum IconStyle {
  Regular = 'Regular',
  Filled = 'Filled'
}

export interface ICustomTheme {
  themePrimary?: string;
  themeSecondary?: string;
  themeDark?: string;
  themeDarker?: string;
  themeTertiary?: string;
  themeLight?: string;
  themeDarkAlt?: string;
  themeLighter?: string;
  themeLighterAlt?: string;
  themeDarkAltTransparent?: string;
  themeLighterTransparent?: string;
  themeLighterAltTransparent?: string;
  themeMedium?: string;
  neutralPrimary?: string;
  neutralLight?: string;
  neutralLighter?: string;
  neutralLighterAlt?: string;
  neutralSecondary?: string;
  neutralSecondaryAlt?: string;
  neutralTertiary?: string;
  neutralTertiaryAlt?: string;
  neutralQuaternary?: string;
  neutralQuaternaryAlt?: string;
  neutralPrimaryAlt?: string;
  neutralDark?: string;
  black?: string;
  themeBackground?: string;
  isDarkModeEnabled?: boolean;
}

export interface IThemeOptions {
  useDarkMode?: boolean;
  customTheme?: ICustomTheme;
}

export interface IBaseDataSource {
  type: DataSourceType;
}

export interface IFileDataSource extends IBaseDataSource {
  type: DataSourceType.File;
  value: {
    webId: string;
    listId: string;
    siteId: string;
    uniqueId: string;
    fileName?: string;
  };
}

export interface IFolderDataSource extends IBaseDataSource {
  type: DataSourceType.Folder;
  value: {
    name?: string;
    url: string;
  };
}

export interface ISiteDataSource extends IBaseDataSource {
  type: DataSourceType.Site;
  value: {
    name?: string;
    url: string;
  };
}

export interface IDocumentLibraryDataSource extends IBaseDataSource {
  type: DataSourceType.DocumentLibrary;
  value: {
    name?: string;
    url: string;
  };
}

export interface IWorkingSetDataSource extends IBaseDataSource {
  type: DataSourceType.WorkingSet;
  value: {
    isEnabled: boolean;
  };
}

export interface IMeetingDataSource extends IBaseDataSource {
  type: DataSourceType.Meeting;
  value: {
    isEnabled: boolean;
  };
}

export type IDataSourcesProps =
  | IFileDataSource
  | IFolderDataSource
  | IDocumentLibraryDataSource
  | ISiteDataSource
  | IWorkingSetDataSource
  | IMeetingDataSource;

export enum DataSourceType {
  File = 'File',
  Folder = 'Folder',
  DocumentLibrary = 'DocumentLibrary',
  Site = 'Site',
  WorkingSet = 'WorkingSet',
  Meeting = 'Meeting'
}
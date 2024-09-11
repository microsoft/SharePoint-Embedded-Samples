
import React, { useEffect, useState } from 'react';
import {
    Breadcrumb,
    BreadcrumbButton,
    BreadcrumbItem,
    BreadcrumbDivider,
    Link, 
    DataGrid, 
    DataGridHeader, 
    DataGridRow, 
    DataGridHeaderCell, 
    DataGridBody, 
    DataGridCell, 
    TableColumnDefinition, 
    createTableColumn, 
    TableCellLayout, 
    OnSelectionChangeData,
} from '@fluentui/react-components';
import {
    Folder24Filled,
    Checkmark16Filled,
} from '@fluentui/react-icons';
import { IContainer } from '../../../common/schemas/ContainerSchemas';
import { ContainersApiProvider } from '../providers/ContainersApiProvider';
import { IDriveItem } from '../common/FileSchemas';
import { GraphProvider } from '../providers/GraphProvider';
import { getFileTypeIconProps } from '@fluentui/react-file-type-icons';
import { Icon } from '@fluentui/react';
import ContainerActionBar from './ContainerActionBar';
import { useLoaderData, useNavigate } from 'react-router-dom';
import { ILoaderParams } from '../common/ILoaderParams';

const containersApi = ContainersApiProvider.instance;
const filesApi = GraphProvider.instance;

export interface IContainerContentBrowserProps {
    container: IContainer | string;
}

export async function loader({ params }: ILoaderParams): Promise<IContainer | undefined> {
    const containerId = params.containerId as string || undefined;
    if (containerId) {
        const container = await containersApi.get(containerId);
        return container;
    }
}

export const ContainerBrowser: React.FunctionComponent = () => {
    const container = useLoaderData() as IContainer | undefined;
    const navigate = useNavigate();
    const [parentId, setParentId] = useState<string>('root');
    const [driveItems, setDriveItems] = useState<IDriveItem[]>([] as IDriveItem[]);
    const [folderPath, setFolderPath] = useState<IDriveItem[]>([] as IDriveItem[]);
    const [selectedItem, setSelectedItem] = useState<IDriveItem | undefined>(undefined);
    const [selectedItemKeys, setSelectedItemKeys] = useState<string[]>([]);
    const [refreshTime, setRefreshTime] = useState<number>(0);

    useEffect(() => {
        (async () => {
            if (!container) {
                return;
            }
            filesApi.listItems(container.id, parentId)
                .then(setDriveItems)
                .catch(console.error);
        })();
    }, [container, parentId, refreshTime]);

    const refresh = () => {
        setRefreshTime(new Date().getTime());
    }

    const setLocation = (newPath: IDriveItem[]) => {
        let newParentId = 'root';
        if (newPath.length > 0) {
            newParentId = newPath[newPath.length - 1].id;
        }
        if (newParentId !== parentId) {
            setFolderPath(newPath);
            setParentId(newParentId);
            clearSelection();
        }
    };

    const clearSelection = () => {
        setSelectedItem(undefined);
        setSelectedItemKeys([]);
    };

    const onBreadcrumbClick = (folder: IDriveItem) => {
        while (folderPath.length > 0 && folderPath[folderPath.length - 1].id !== folder.id) {
            folderPath.pop();
        }
        setLocation(folderPath);
    };

    const onFolderClicked = (folder: IDriveItem) => {
        setLocation([...folderPath, folder]);
    };

    const onSelectionChange = (ignored: any, data: OnSelectionChangeData) => {
        if (data.selectedItems.size > 1) {
            throw new Error('Only single selection is supported')
        }
        const selectedItemKey = data.selectedItems.values().next().value as string;
        if (selectedItemKey === selectedItem?.id) {
            clearSelection();
        } else {
            setSelectedItemKeys([selectedItemKey]);
            setSelectedItem(driveItems.find((item) => item.id === selectedItemKey)!);
        }
    }

    const onFilePreviewSelected = async (file: IDriveItem) => {
        if (!container) {
            return;
        }
        if (!file.isFile) {
            return;
        }
        filesApi.getPreviewUrl(container.id, file.id).then((url) => {
            if (url) {
                window.open(url, '_blank');
            }
        });
    };

    const getItemIcon = (driveItem: IDriveItem): JSX.Element => {
        if (driveItem.folder) {
            return <Folder24Filled primaryFill='#FFCE3D' />;
        }
        const iconProps = getFileTypeIconProps({ extension: driveItem.extension, size: 24 });
        return <Icon {...iconProps} />;
    }

    // Used to prevent the DataGrid Link click from causing a selection change on the row
    const stopPropagation = (e: any) => {
        if (e.stopPropagation) {
            e.stopPropagation();
        }
    }

    const getItemName = (driveItem: IDriveItem): JSX.Element => {
        if (driveItem.isOfficeDocument) {
            return <Link
                style={{ fontSize: '12px' }}
                href={driveItem!.webUrl!}
                target='_blank'
                onClickCapture={stopPropagation}>
                {driveItem.name}
            </Link>;
        }
        if (driveItem.folder) {
            return <Link style={{ fontSize: '12px' }} onClick={e => {onFolderClicked(driveItem); stopPropagation(e)}}>{driveItem.name}</Link>;
        }
        return <Link style={{ fontSize: '12px' }} onClick={e => {onFilePreviewSelected(driveItem); stopPropagation(e)}}>{driveItem.name}</Link>;
    }

    const columns: TableColumnDefinition<IDriveItem>[] = [
        createTableColumn<IDriveItem>({
            columnId: 'driveItemName',
            renderHeaderCell: () => {
                return 'Name'
            },
            renderCell: (driveItem) => {
                return (
                    <TableCellLayout media={getItemIcon(driveItem)}>
                        {getItemName(driveItem)}
                    </TableCellLayout>
                )
            }
        }),
        createTableColumn<IDriveItem>({
            columnId: 'lastModifiedTimestamp',
            renderHeaderCell: () => {
                return 'Modified'
            },
            renderCell: (driveItem) => {
                return (
                    <TableCellLayout>
                        {driveItem.lastModifiedDateTime}
                    </TableCellLayout>
                )
            }
        }),
        createTableColumn<IDriveItem>({
            columnId: 'lastModifiedBy',
            renderHeaderCell: () => {
                return 'Modified By'
            },
            renderCell: (driveItem) => {
                return (
                    <TableCellLayout>
                        {driveItem.modifiedByName}
                    </TableCellLayout>
                )
            }
        }),
    ];
    if (container?.customProperties?.docProcessingSubscriptionId) {
        columns.push(
            createTableColumn<IDriveItem>({
                columnId: 'Merchant',
                renderHeaderCell: () => {
                    return 'Merchant'
                },
                renderCell: (driveItem) => {
                    return (
                        <TableCellLayout>
                            {driveItem.listItem?.fields?.['Merchant']}
                        </TableCellLayout>
                    )
                }
            })
        );
        columns.push(
            createTableColumn<IDriveItem>({
                columnId: 'Total',
                renderHeaderCell: () => {
                    return 'Total'
                },
                renderCell: (driveItem) => {
                    return (
                        <TableCellLayout>
                            {driveItem.listItem?.fields?.['Total']}
                        </TableCellLayout>
                    )
                }
            })
        );
        columns.push(
            createTableColumn<IDriveItem>({
                columnId: 'DocProcessingCompleted',
                renderHeaderCell: () => {
                    return 'Processed'
                },
                renderCell: (driveItem) => {
                    return (
                        <TableCellLayout>
                            {driveItem.listItem?.fields?.['DocProcessingCompleted'] && (
                                <Checkmark16Filled />
                            )}
                        </TableCellLayout>
                    )
                }
            })
        );
    }

    const columnSizingOptions = {
        driveItemName: {
            minWidth: 350,
            defaultWidth: 350,
            idealWidth: 350
        },
        lastModifiedTimestamp: {
            minWidth: 150,
            defaultWidth: 150
        },
        lastModifiedBy: {
            minWidth: 150,
            defaultWidth: 150
        },
    };

    return (
        <div>
            <div className="view-container-breadcrumb">
                <Breadcrumb size='medium'>
                    <BreadcrumbItem>
                        <BreadcrumbButton size='medium' onClick={() => navigate('/containers')}>Containers</BreadcrumbButton>
                    </BreadcrumbItem>
                    {container && (<>
                        <BreadcrumbDivider />
                        <BreadcrumbItem>
                            <BreadcrumbButton size='medium' onClick={() => setLocation([])}>{container.displayName}</BreadcrumbButton>
                        </BreadcrumbItem>
                        {folderPath.map((folder) => (
                            <React.Fragment key={folder.id}>
                                <BreadcrumbDivider />
                                <BreadcrumbItem>
                                    <BreadcrumbButton onClick={() => onBreadcrumbClick(folder)}>{folder.name}</BreadcrumbButton>
                                </BreadcrumbItem>
                            </React.Fragment>
                        ))}
                    </>)}
                </Breadcrumb>
            </div>
            {container && (<div className="container-browser">
                <div className="container-actions">
                    <ContainerActionBar
                        container={container}
                        parentId={parentId}
                        selectedItem={selectedItem}
                        onFilePreviewSelected={onFilePreviewSelected}
                        onItemsUpdated={refresh}
                    />
                </div>
                <div className="files-list-container">
                    <DataGrid
                        items={driveItems}
                        columns={columns}
                        getRowId={(driveItem) => driveItem.id}
                        resizableColumns
                        selectionMode="single"
                        columnSizingOptions={columnSizingOptions}
                        selectedItems={selectedItemKeys}
                        onSelectionChange={onSelectionChange}
                        style={{ minWidth: '100%', maxWidth: '100%', width: '100%' }}
                    >
                        <DataGridHeader>
                            <DataGridRow
                                selectionCell={{ checkboxIndicator: { "aria-label": "Select row" } }}
                            >
                                {({ renderHeaderCell }) => (
                                    <DataGridHeaderCell>
                                        <b>{renderHeaderCell()}</b>
                                    </DataGridHeaderCell>
                                )}
                            </DataGridRow>
                        </DataGridHeader>
                        <DataGridBody<IDriveItem>>
                            {({ item, rowId }) => (
                                <DataGridRow<IDriveItem>
                                    key={rowId}
                                    selectionCell={{ checkboxIndicator: { "aria-label": "Select row" } }}
                                >
                                    {({ renderCell }) => (
                                        <DataGridCell>
                                            {renderCell(item)}
                                        </DataGridCell>
                                    )}
                                </DataGridRow>
                            )}
                        </DataGridBody>
                    </DataGrid>
                </div>
            </div>)}
        </div>
    );
}

export default ContainerBrowser;

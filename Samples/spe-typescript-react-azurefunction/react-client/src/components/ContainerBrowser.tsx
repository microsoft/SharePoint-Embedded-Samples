
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
    Open20Filled,
} from '@fluentui/react-icons';
import { IContainer } from '../../../common/schemas/ContainerSchemas';
import { ContainersApiProvider } from '../providers/ContainersApiProvider';
import { IDriveItem } from '../common/FileSchemas';
import { GraphProvider } from '../providers/GraphProvider';
import { GraphAuthProvider } from '../providers/GraphAuthProvider';
import { getFileTypeIconProps } from '@fluentui/react-file-type-icons';
import { Icon, Modal, Shimmer } from '@fluentui/react';
import ContainerActionBar from './ContainerActionBar';
import { useLoaderData, useNavigate, useParams, useRevalidator } from 'react-router-dom';
import { ILoaderParams } from '../common/ILoaderParams';
import { io } from 'socket.io-client';
import { useContainer } from '../routes/App';
import { hostTheme } from '../common/theme';
import EmbedIFrameV2 from './EmbedIFrameV2';
import { MipAuthProvider } from '../providers/MipAuthProvider';

const containersApi = ContainersApiProvider.instance;
const filesApi = GraphProvider.instance;

export interface IContainerContentBrowserProps {
    container: IContainer | string;
}

export interface IContainerLoader {
    container: IContainer | undefined;
    parent: IDriveItem | undefined;
    driveItems: IDriveItem[];
}

export async function loader({ params }: ILoaderParams): Promise<IContainerLoader> {
    const containerId = params.containerId as string || undefined;
    if (!containerId) {
        throw new Error('Container ID is required');
    }
    const itemId = params.itemId as string || 'root';

    let container = undefined;
    try {
        container = await containersApi.get(containerId);
    } catch (e) {
        console.log(`Failed to load container: ${e}`);
    }

    let parent = undefined;
    try {
        parent = await filesApi.getItem(containerId, itemId);
    } catch (e) {
        console.log(`Failed to load parent item: ${e}`);
    }

    let driveItems: IDriveItem[] = [];
    try {
        driveItems = await filesApi.listItems(containerId, itemId);
    } catch (e) {
        console.log(`Failed to load drive items: ${e}`);
    }

    return {
        container: container,
        parent: parent,
        driveItems: driveItems,
    }
}

export const channelId = '0.44338641';
const getEmbedOptions = (embedOptions: any) => encodeURIComponent(JSON.stringify(embedOptions));
export const hostOrigin = 'http://localhost:8080';

// Get embed options
const embedParam = getEmbedOptions({
    af: false,
    o: window.location.origin,
    z: 'width',
    mpmp: true // Allow MIP
});

export const ContainerBrowser: React.FunctionComponent = () => {
    const { container, parent, driveItems } = useLoaderData() as IContainerLoader;
    const { containerId, itemId = 'root' } = useParams();
    const { revalidate } = useRevalidator();
    const navigate = useNavigate();

    // Generate a dynamic channel ID for embedding
    //const channelId = `channel_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const [folderPath, setFolderPath] = useState<IDriveItem[]>([] as IDriveItem[]);
    const [selectedItem, setSelectedItem] = useState<IDriveItem | undefined>(undefined);
    const [selectedItemKeys, setSelectedItemKeys] = useState<string[]>([]);
    const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
    const [previewUrl, setPreviewUrl] = useState<URL | undefined>(undefined);
    const [previewFile, setPreviewFile] = useState<IDriveItem | undefined>(undefined);
    const [previewContext, setPreviewContext] = useState<string>('');
    const [authToken, setAuthToken] = useState<string>('');
    const { setSelectedContainer } = useContainer();

    useEffect(() => {
        setSelectedContainer(container);
        if (container) {
            filesApi.getSocketUrl(container.id)
                .then((url) => {
                    const urlStr = url.toString();
                    // Use a type assertion to allow the transports option
                    const socket = io(urlStr, { transports: ["websocket"] } as any);
                    socket.on('notification', revalidate);
                })
                .catch(console.error);
        }
    }, [container, setSelectedContainer, revalidate]);

    useEffect(() => {
        if (parent) {
            filesApi.getItemPath(parent)
                .then(setFolderPath)
                .catch(e => console.log(`Failed to load folder path: ${e}`));
        }
    }, [parent]);

    const clearSelection = () => {
        setSelectedItem(undefined);
        setSelectedItemKeys([]);
    };

    const onBreadcrumbClick = (folder: IDriveItem) => {
        navigate(`/containers/${containerId}/${folder.id}`);
    };

    const onFolderClicked = (folder: IDriveItem) => {
        navigate(`/containers/${containerId}/${folder.id}`);
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
        if (!containerId) {
            return;
        }
        if (!file.isFile) {
            return;
        }

        setPreviewFile(file);
        setIsPreviewOpen(true);

        // Get the preview URL
        try {
            const url = await filesApi.getPreviewUrl(containerId, file.id);
            if (url) {
                setPreviewUrl(url);



                // Enhance URL with channel ID and origin
                let enhancedUrl = url.toString() +
                    `&embed=${embedParam}` +
                    `#channelId=${channelId}&origin=${hostOrigin}`;

                // Prepare context object
                const context: {
                    item: {
                        name: string;
                        [key: string]: any; // Allow for dynamic properties like '@content.downloadUrl'
                    };
                    theme: any;
                    accessToken: string;
                } = {
                    item: {
                        name: file.name,
                    },
                    theme: hostTheme,
                    accessToken: ''
                };

                // If we have a download URL, add it to the context
                if (file.downloadUrl) {
                    context.item['@content.downloadUrl'] = file.downloadUrl;
                }


                // Get auth token
                try {
                    const authProvider = MipAuthProvider.instance;
                    const token = await authProvider.getToken();
                    setAuthToken(token);
                    context.accessToken = token;
                    setPreviewContext(JSON.stringify(context));
                } catch (error) {
                    console.error('Failed to get auth token:', error);
                    setAuthToken('');

                    // Set empty token in context
                    context.accessToken = '';
                    setPreviewContext(JSON.stringify(context));
                }

            }
        } catch (error) {
            console.error('Failed to get preview URL:', error);
        }
    };

    const closePreview = () => {
        setIsPreviewOpen(false);
        setPreviewUrl(undefined);
        setPreviewFile(undefined);
        setPreviewContext('');
        setAuthToken('');
    }

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
            return <Link style={{ fontSize: '12px' }} onClick={e => { onFolderClicked(driveItem); stopPropagation(e) }}>{driveItem.name}</Link>;
        }
        return <Link style={{ fontSize: '12px' }} onClick={e => { onFilePreviewSelected(driveItem); stopPropagation(e) }}>{driveItem.name}</Link>;
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
                    <BreadcrumbDivider />
                    <BreadcrumbItem>
                        <BreadcrumbButton size='medium' onClick={() => navigate(`/containers/${containerId}`)}>{container?.displayName || 'Container'}</BreadcrumbButton>
                    </BreadcrumbItem>
                    {folderPath.map((folder) => (
                        <React.Fragment key={folder.id}>
                            <BreadcrumbDivider />
                            <BreadcrumbItem>
                                <BreadcrumbButton onClick={() => onBreadcrumbClick(folder)}>{folder.name}</BreadcrumbButton>
                            </BreadcrumbItem>
                        </React.Fragment>
                    ))}
                </Breadcrumb>
            </div>
            <div className="container-browser">
                <div className="container-actions">
                    {containerId && itemId && (
                        <ContainerActionBar
                            containerId={containerId}
                            parentId={itemId}
                            selectedItem={selectedItem}
                            onFilePreviewSelected={onFilePreviewSelected}
                            onItemsUpdated={revalidate}
                        />
                    )}
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
            </div>
            <Modal
                isOpen={isPreviewOpen}
                onDismiss={closePreview}
                isBlocking={false}
                containerClassName='file-preview-modal'
            >
                {previewFile && (<>
                    <Link
                        style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1000 }}
                        onClick={closePreview}
                    >
                        <Icon iconName='Cancel' />
                    </Link>
                    <h2 style={{ textAlign: 'center' }}>
                        {previewUrl && (
                            <Link
                                href={previewUrl.toString()}
                                target='_blank'
                                onClick={closePreview}
                            >
                                {previewFile.name}
                                <Open20Filled style={{ marginLeft: '5px' }} />
                            </Link>
                        )}
                        {!previewUrl && (
                            <>{previewFile.name}</>
                        )}
                    </h2>
                    {previewUrl && previewContext && (
                        <div style={{ 
                            width: '90vw', 
                            height: '80vh', 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center' 
                        }}>
                            <EmbedIFrameV2
                                actionUrl={previewUrl.toString() + `&embed=${embedParam}` + `#channelId=${channelId}&origin=${hostOrigin}`}
                                context={previewContext}
                                authToken={authToken}
                            />
                        </div>
                    )}
                    {!previewUrl && (
                        <div style={{ alignContent: 'center', padding: '40px', width: '80vw', height: '80vh', border: 'none' }}>
                            <Shimmer width="75%" style={{ padding: '10px' }} />
                            <Shimmer width="75%" style={{ padding: '10px' }} />
                            <Shimmer width="50%" style={{ padding: '10px' }} />
                            <Shimmer width="50%" style={{ padding: '10px' }} />
                            <Shimmer width="25%" style={{ padding: '10px' }} />
                            <Shimmer width="25%" style={{ padding: '10px' }} />
                        </div>
                    )}
                </>)}
            </Modal>

        </div>
    );
}

export default ContainerBrowser;
